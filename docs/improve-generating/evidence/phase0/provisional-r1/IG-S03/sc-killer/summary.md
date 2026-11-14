# IG-S03 / sc-killer (provisional-r1, a1)

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
| killer:nightmare:1 | n/a | n/a | n/a | 7205.603 | 7338.349 | 24798 | n/a | n/a | n/a |
| killer:nightmare:2 | n/a | n/a | n/a | 15097.582 | 15221.003 | 36733 | n/a | n/a | n/a |
| killer:nightmare:3 | n/a | n/a | n/a | 8458.326 | 8577.457 | 27766 | n/a | n/a | n/a |

## Arm: prototype

| metric | n | p50 | p95 | max | upper median |
|---|---|---|---|---|---|
| ready wall ms | 3 | 8458.326 | 15097.582 | 15097.582 | 8458.326 |
| cold wall ms | 3 | 8577.457 | 15221.003 | 15221.003 | 8577.457 |
| cpu total ms | 3 | 27766 | 36733 | 36733 | 27766 |

Requests 3, complete 3, censored 0, errors 0, validation unknown 0, unstarted 0. Verified hits 0; per CPU second 0 (all spent CPU 89297 ms, resolved); per cold wall second 0 (all spent wall 31217.073 ms). With few requests p95 is the observed maximum.

Spent generation work behind the rates (completed, censored, error and validation-unknown requests all count):

| category | requests | cpu ms | wall ms (cold + cleanup) |
|---|---|---|---|
| complete | 3 | 89297 | 31217.073 |
| censored | 0 | 0 | 0 |
| errors | 0 | 0 | 0 |
| validationUnknown | 0 | 0 | 0 |
| total | 3 | 89297 | 31217.073 |

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
        "pairId": "IG-S03/sc-killer/killer:nightmare:1/scoped-attempts-w4",
        "baselineKey": "IG-S02/killer/killer:nightmare:1/native-w1",
        "verdict": "identity-ok",
        "problems": [],
        "differing": [],
        "puzzleHash": "4e092605feea23c59789f6a9e8345157e241f675523d07614c7512f554ade73b",
        "baselinePuzzleHash": "4e092605feea23c59789f6a9e8345157e241f675523d07614c7512f554ade73b",
        "scopedDigest": "435f77ceb9b0ad742b7ffd468b42fe065c1146312359b43974e4b72c26d53506",
        "baselineDigest": "435f77ceb9b0ad742b7ffd468b42fe065c1146312359b43974e4b72c26d53506"
      },
      {
        "pairId": "IG-S03/sc-killer/killer:nightmare:2/scoped-attempts-w4",
        "baselineKey": "IG-S02/killer/killer:nightmare:2/native-w1",
        "verdict": "identity-ok",
        "problems": [],
        "differing": [],
        "puzzleHash": "a8fc1719429a1c83d575dace65473bcac17c47e5d1a72ab5c101b2a77eab1cd4",
        "baselinePuzzleHash": "a8fc1719429a1c83d575dace65473bcac17c47e5d1a72ab5c101b2a77eab1cd4",
        "scopedDigest": "0aa50b0bd457348d467c40ffb76808213a975776c3244eef8cd25c76d785c3ee",
        "baselineDigest": "0aa50b0bd457348d467c40ffb76808213a975776c3244eef8cd25c76d785c3ee"
      },
      {
        "pairId": "IG-S03/sc-killer/killer:nightmare:3/scoped-attempts-w4",
        "baselineKey": "IG-S02/killer/killer:nightmare:3/native-w1",
        "verdict": "identity-ok",
        "problems": [],
        "differing": [],
        "puzzleHash": "e21169d335afd1a76cb75a1ccee1e9ab6fb3acca7f788c16dadc650667cf0a6f",
        "baselinePuzzleHash": "e21169d335afd1a76cb75a1ccee1e9ab6fb3acca7f788c16dadc650667cf0a6f",
        "scopedDigest": "2c38999202a0010d9bce1d172af1074aae83c2727736c0f1100fdc1f59dfa191",
        "baselineDigest": "2c38999202a0010d9bce1d172af1074aae83c2727736c0f1100fdc1f59dfa191"
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
      "key": "IG-S03/sc-killer/killer:nightmare:1/scoped-attempts-w4",
      "stats": {
        "messages": 8,
        "solve": {
          "solvesBegun": 21092,
          "stepsApplied": 1533092,
          "cellsInvalidated": 27271057,
          "unitsInvalidated": 42567759,
          "applyCalls": 0
        },
        "finders": {
          "nakedSingle": {
            "calls": 1533419,
            "scopesVisited": 91105182,
            "realScopes": 22191108,
            "negativeRecorded": 21354289,
            "positiveScopes": 836819,
            "skippedScopes": 68914074,
            "enumNodesReal": 0,
            "enumNodesSkipped": 0,
            "realEntryChecks": 0,
            "virtualEntryChecks": 0,
            "realNodeChecks": 0,
            "virtualNodeChecks": 0,
            "nativeFallbackCalls": 0
          },
          "hiddenSingleBox": {
            "calls": 696600,
            "scopesVisited": 17629064,
            "realScopes": 6639694,
            "negativeRecorded": 6460937,
            "positiveScopes": 178757,
            "skippedScopes": 10989370,
            "enumNodesReal": 0,
            "enumNodesSkipped": 0,
            "realEntryChecks": 0,
            "virtualEntryChecks": 0,
            "realNodeChecks": 0,
            "virtualNodeChecks": 0,
            "nativeFallbackCalls": 0
          },
          "hiddenSingleLine": {
            "calls": 517843,
            "scopesVisited": 8957651,
            "realScopes": 4881894,
            "negativeRecorded": 4843247,
            "positiveScopes": 38647,
            "skippedScopes": 4075757,
            "enumNodesReal": 0,
            "enumNodesSkipped": 0,
            "realEntryChecks": 0,
            "virtualEntryChecks": 0,
            "realNodeChecks": 0,
            "virtualNodeChecks": 0,
            "nativeFallbackCalls": 0
          },
          "nakedPair": {
            "calls": 38032,
            "scopesVisited": 1808382,
            "realScopes": 586432,
            "negativeRecorded": 583937,
            "positiveScopes": 2495,
            "skippedScopes": 1221950,
            "enumNodesReal": 478124,
            "enumNodesSkipped": 933690,
            "realEntryChecks": 586432,
            "virtualEntryChecks": 1221950,
            "realNodeChecks": 5,
            "virtualNodeChecks": 13,
            "nativeFallbackCalls": 0
          },
          "hiddenPair": {
            "calls": 35537,
            "scopesVisited": 1748745,
            "realScopes": 572579,
            "negativeRecorded": 571733,
            "positiveScopes": 846,
            "skippedScopes": 1176166,
            "enumNodesReal": 390548,
            "enumNodesSkipped": 738644,
            "realEntryChecks": 572579,
            "virtualEntryChecks": 1176166,
            "realNodeChecks": 2,
            "virtualNodeChecks": 2,
            "nativeFallbackCalls": 0
          },
          "nakedTriple": {
            "calls": 34691,
            "scopesVisited": 1715146,
            "realScopes": 564911,
            "negativeRecorded": 564206,
            "positiveScopes": 705,
            "skippedScopes": 1150235,
            "enumNodesReal": 699167,
            "enumNodesSkipped": 1280116,
            "realEntryChecks": 564911,
            "virtualEntryChecks": 1150235,
            "realNodeChecks": 168,
            "virtualNodeChecks": 352,
            "nativeFallbackCalls": 0
          },
          "hiddenTriple": {
            "calls": 33986,
            "scopesVisited": 1694069,
            "realScopes": 559577,
            "negativeRecorded": 559279,
            "positiveScopes": 298,
            "skippedScopes": 1134492,
            "enumNodesReal": 649059,
            "enumNodesSkipped": 1156525,
            "realEntryChecks": 559577,
            "virtualEntryChecks": 1134492,
            "realNodeChecks": 69,
            "virtualNodeChecks": 46,
            "nativeFallbackCalls": 0
          },
          "nakedQuad": {
            "calls": 3944,
            "scopesVisited": 191905,
            "realScopes": 84850,
            "negativeRecorded": 84798,
            "positiveScopes": 52,
            "skippedScopes": 107055,
            "enumNodesReal": 196521,
            "enumNodesSkipped": 195144,
            "realEntryChecks": 84850,
            "virtualEntryChecks": 107055,
            "realNodeChecks": 164,
            "virtualNodeChecks": 294,
            "nativeFallbackCalls": 0
          },
          "hiddenQuad": {
            "calls": 3892,
            "scopesVisited": 191312,
            "realScopes": 84573,
            "negativeRecorded": 84572,
            "positiveScopes": 1,
            "skippedScopes": 106739,
            "enumNodesReal": 183532,
            "enumNodesSkipped": 182446,
            "realEntryChecks": 84573,
            "virtualEntryChecks": 106739,
            "realNodeChecks": 128,
            "virtualNodeChecks": 207,
            "nativeFallbackCalls": 0
          }
        },
        "fallbackReasons": {},
        "violations": 0
      },
      "note": "summed over the pipeline runs that finished in the pool workers (consumed and speculative completed attempts); an attempt terminated before its end reports none"
    },
    {
      "key": "IG-S03/sc-killer/killer:nightmare:2/scoped-attempts-w4",
      "stats": {
        "messages": 8,
        "solve": {
          "solvesBegun": 19136,
          "stepsApplied": 1341937,
          "cellsInvalidated": 24198082,
          "unitsInvalidated": 37356463,
          "applyCalls": 0
        },
        "finders": {
          "nakedSingle": {
            "calls": 1342223,
            "scopesVisited": 79544643,
            "realScopes": 19712553,
            "negativeRecorded": 18966729,
            "positiveScopes": 745824,
            "skippedScopes": 59832090,
            "enumNodesReal": 0,
            "enumNodesSkipped": 0,
            "realEntryChecks": 0,
            "virtualEntryChecks": 0,
            "realNodeChecks": 0,
            "virtualNodeChecks": 0,
            "nativeFallbackCalls": 0
          },
          "hiddenSingleBox": {
            "calls": 596399,
            "scopesVisited": 14274071,
            "realScopes": 5488265,
            "negativeRecorded": 5318022,
            "positiveScopes": 170243,
            "skippedScopes": 8785806,
            "enumNodesReal": 0,
            "enumNodesSkipped": 0,
            "realEntryChecks": 0,
            "virtualEntryChecks": 0,
            "realNodeChecks": 0,
            "virtualNodeChecks": 0,
            "nativeFallbackCalls": 0
          },
          "hiddenSingleLine": {
            "calls": 426156,
            "scopesVisited": 7360443,
            "realScopes": 4035608,
            "negativeRecorded": 4002302,
            "positiveScopes": 33306,
            "skippedScopes": 3324835,
            "enumNodesReal": 0,
            "enumNodesSkipped": 0,
            "realEntryChecks": 0,
            "virtualEntryChecks": 0,
            "realNodeChecks": 0,
            "virtualNodeChecks": 0,
            "nativeFallbackCalls": 0
          },
          "nakedPair": {
            "calls": 28278,
            "scopesVisited": 1337467,
            "realScopes": 448383,
            "negativeRecorded": 446819,
            "positiveScopes": 1564,
            "skippedScopes": 889084,
            "enumNodesReal": 317200,
            "enumNodesSkipped": 481511,
            "realEntryChecks": 448383,
            "virtualEntryChecks": 889084,
            "realNodeChecks": 9,
            "virtualNodeChecks": 15,
            "nativeFallbackCalls": 0
          },
          "hiddenPair": {
            "calls": 26714,
            "scopesVisited": 1290297,
            "realScopes": 433416,
            "negativeRecorded": 432555,
            "positiveScopes": 861,
            "skippedScopes": 856881,
            "enumNodesReal": 282231,
            "enumNodesSkipped": 415035,
            "realEntryChecks": 433416,
            "virtualEntryChecks": 856881,
            "realNodeChecks": 3,
            "virtualNodeChecks": 7,
            "nativeFallbackCalls": 0
          },
          "nakedTriple": {
            "calls": 25853,
            "scopesVisited": 1262945,
            "realScopes": 426752,
            "negativeRecorded": 426160,
            "positiveScopes": 592,
            "skippedScopes": 836192,
            "enumNodesReal": 535079,
            "enumNodesSkipped": 726913,
            "realEntryChecks": 426752,
            "virtualEntryChecks": 836192,
            "realNodeChecks": 79,
            "virtualNodeChecks": 123,
            "nativeFallbackCalls": 0
          },
          "hiddenTriple": {
            "calls": 25260,
            "scopesVisited": 1244115,
            "realScopes": 422777,
            "negativeRecorded": 422519,
            "positiveScopes": 258,
            "skippedScopes": 821338,
            "enumNodesReal": 500304,
            "enumNodesSkipped": 656936,
            "realEntryChecks": 422777,
            "virtualEntryChecks": 821338,
            "realNodeChecks": 32,
            "virtualNodeChecks": 64,
            "nativeFallbackCalls": 0
          },
          "nakedQuad": {
            "calls": 3831,
            "scopesVisited": 186303,
            "realScopes": 71102,
            "negativeRecorded": 71095,
            "positiveScopes": 7,
            "skippedScopes": 115201,
            "enumNodesReal": 247650,
            "enumNodesSkipped": 226114,
            "realEntryChecks": 71102,
            "virtualEntryChecks": 115201,
            "realNodeChecks": 213,
            "virtualNodeChecks": 300,
            "nativeFallbackCalls": 0
          },
          "hiddenQuad": {
            "calls": 3824,
            "scopesVisited": 186136,
            "realScopes": 71074,
            "negativeRecorded": 71072,
            "positiveScopes": 2,
            "skippedScopes": 115062,
            "enumNodesReal": 219885,
            "enumNodesSkipped": 203023,
            "realEntryChecks": 71074,
            "virtualEntryChecks": 115062,
            "realNodeChecks": 98,
            "virtualNodeChecks": 178,
            "nativeFallbackCalls": 0
          }
        },
        "fallbackReasons": {},
        "violations": 0
      },
      "note": "summed over the pipeline runs that finished in the pool workers (consumed and speculative completed attempts); an attempt terminated before its end reports none"
    },
    {
      "key": "IG-S03/sc-killer/killer:nightmare:3/scoped-attempts-w4",
      "stats": {
        "messages": 8,
        "solve": {
          "solvesBegun": 21334,
          "stepsApplied": 1519786,
          "cellsInvalidated": 27242580,
          "unitsInvalidated": 42014498,
          "applyCalls": 0
        },
        "finders": {
          "nakedSingle": {
            "calls": 1520308,
            "scopesVisited": 89840257,
            "realScopes": 22071571,
            "negativeRecorded": 21230607,
            "positiveScopes": 840964,
            "skippedScopes": 67768686,
            "enumNodesReal": 0,
            "enumNodesSkipped": 0,
            "realEntryChecks": 0,
            "virtualEntryChecks": 0,
            "realNodeChecks": 0,
            "virtualNodeChecks": 0,
            "nativeFallbackCalls": 0
          },
          "hiddenSingleBox": {
            "calls": 679344,
            "scopesVisited": 16319983,
            "realScopes": 6264036,
            "negativeRecorded": 6080554,
            "positiveScopes": 183482,
            "skippedScopes": 10055947,
            "enumNodesReal": 0,
            "enumNodesSkipped": 0,
            "realEntryChecks": 0,
            "virtualEntryChecks": 0,
            "realNodeChecks": 0,
            "virtualNodeChecks": 0,
            "nativeFallbackCalls": 0
          },
          "hiddenSingleLine": {
            "calls": 495862,
            "scopesVisited": 8596165,
            "realScopes": 4698833,
            "negativeRecorded": 4662115,
            "positiveScopes": 36718,
            "skippedScopes": 3897332,
            "enumNodesReal": 0,
            "enumNodesSkipped": 0,
            "realEntryChecks": 0,
            "virtualEntryChecks": 0,
            "realNodeChecks": 0,
            "virtualNodeChecks": 0,
            "nativeFallbackCalls": 0
          },
          "nakedPair": {
            "calls": 37010,
            "scopesVisited": 1708732,
            "realScopes": 569446,
            "negativeRecorded": 567024,
            "positiveScopes": 2422,
            "skippedScopes": 1139285,
            "enumNodesReal": 451549,
            "enumNodesSkipped": 894589,
            "realEntryChecks": 569446,
            "virtualEntryChecks": 1139285,
            "realNodeChecks": 9,
            "virtualNodeChecks": 29,
            "nativeFallbackCalls": 0
          },
          "hiddenPair": {
            "calls": 34587,
            "scopesVisited": 1650814,
            "realScopes": 550971,
            "negativeRecorded": 550081,
            "positiveScopes": 890,
            "skippedScopes": 1099842,
            "enumNodesReal": 381797,
            "enumNodesSkipped": 763230,
            "realEntryChecks": 550971,
            "virtualEntryChecks": 1099842,
            "realNodeChecks": 4,
            "virtualNodeChecks": 13,
            "nativeFallbackCalls": 0
          },
          "nakedTriple": {
            "calls": 33696,
            "scopesVisited": 1616122,
            "realScopes": 541670,
            "negativeRecorded": 540963,
            "positiveScopes": 707,
            "skippedScopes": 1074448,
            "enumNodesReal": 819075,
            "enumNodesSkipped": 1521435,
            "realEntryChecks": 541670,
            "virtualEntryChecks": 1074448,
            "realNodeChecks": 377,
            "virtualNodeChecks": 888,
            "nativeFallbackCalls": 0
          },
          "hiddenTriple": {
            "calls": 32985,
            "scopesVisited": 1596114,
            "realScopes": 537050,
            "negativeRecorded": 536721,
            "positiveScopes": 329,
            "skippedScopes": 1059062,
            "enumNodesReal": 742547,
            "enumNodesSkipped": 1354837,
            "realEntryChecks": 537050,
            "virtualEntryChecks": 1059062,
            "realNodeChecks": 146,
            "virtualNodeChecks": 493,
            "nativeFallbackCalls": 0
          },
          "nakedQuad": {
            "calls": 6453,
            "scopesVisited": 303492,
            "realScopes": 125818,
            "negativeRecorded": 125754,
            "positiveScopes": 64,
            "skippedScopes": 177674,
            "enumNodesReal": 390375,
            "enumNodesSkipped": 432339,
            "realEntryChecks": 125818,
            "virtualEntryChecks": 177674,
            "realNodeChecks": 408,
            "virtualNodeChecks": 612,
            "nativeFallbackCalls": 0
          },
          "hiddenQuad": {
            "calls": 6389,
            "scopesVisited": 302083,
            "realScopes": 125233,
            "negativeRecorded": 125206,
            "positiveScopes": 27,
            "skippedScopes": 176850,
            "enumNodesReal": 364552,
            "enumNodesSkipped": 412647,
            "realEntryChecks": 125233,
            "virtualEntryChecks": 176850,
            "realNodeChecks": 315,
            "virtualNodeChecks": 551,
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
    "wallMs": 102.61630000000002,
    "cpuMs": 109,
    "note": "unmeasured: loads the engine once per command so no arm carries the catalogue discovery"
  },
  "chain": {
    "attempts": [
      "a1"
    ],
    "resumed": false,
    "startedBefore": [],
    "startedHere": [
      "IG-S03/sc-killer/killer:nightmare:1/scoped-attempts-w4",
      "IG-S03/sc-killer/killer:nightmare:2/scoped-attempts-w4",
      "IG-S03/sc-killer/killer:nightmare:3/scoped-attempts-w4"
    ],
    "rerunKeys": [],
    "noRerun": true,
    "unstartedAfter": []
  }
}
```
