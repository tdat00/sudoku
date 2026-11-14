# IG-S03 / sc-m16 (provisional-r1, a1)

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
| mega16:nightmare:1 | n/a | n/a | n/a | 69917.922 | 70035.783 | 114453 | n/a | n/a | n/a |
| mega16:nightmare:2 | n/a | n/a | n/a | 51790.308 | 51908.672 | 102969 | n/a | n/a | n/a |
| mega16:nightmare:3 | n/a | n/a | n/a | 54658.649 | 54768.442 | 103593 | n/a | n/a | n/a |

## Arm: prototype

| metric | n | p50 | p95 | max | upper median |
|---|---|---|---|---|---|
| ready wall ms | 3 | 54658.649 | 69917.922 | 69917.922 | 54658.649 |
| cold wall ms | 3 | 54768.442 | 70035.783 | 70035.783 | 54768.442 |
| cpu total ms | 3 | 103593 | 114453 | 114453 | 103593 |

Requests 3, complete 3, censored 0, errors 0, validation unknown 0, unstarted 0. Verified hits 0; per CPU second 0 (all spent CPU 321015 ms, resolved); per cold wall second 0 (all spent wall 176743.540 ms). With few requests p95 is the observed maximum.

Spent generation work behind the rates (completed, censored, error and validation-unknown requests all count):

| category | requests | cpu ms | wall ms (cold + cleanup) |
|---|---|---|---|
| complete | 3 | 321015 | 176743.540 |
| censored | 0 | 0 | 0 |
| errors | 0 | 0 | 0 |
| validationUnknown | 0 | 0 | 0 |
| total | 3 | 321015 | 176743.540 |

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
        "pairId": "IG-S03/sc-m16/mega16:nightmare:1/scoped-attempts-w4",
        "baselineKey": "IG-S02/m16-1/mega16:nightmare:1/native-w1",
        "verdict": "identity-ok",
        "problems": [],
        "differing": [],
        "puzzleHash": "2509df221d72b84e59f7d334d2dd2ea29572e1723490634a054a5e117d098be6",
        "baselinePuzzleHash": "2509df221d72b84e59f7d334d2dd2ea29572e1723490634a054a5e117d098be6",
        "scopedDigest": "e15e5b9a87cc1b1f473811b6bfac991e88ad08653d534292a780d9be4ca43559",
        "baselineDigest": "e15e5b9a87cc1b1f473811b6bfac991e88ad08653d534292a780d9be4ca43559"
      },
      {
        "pairId": "IG-S03/sc-m16/mega16:nightmare:2/scoped-attempts-w4",
        "baselineKey": "IG-S02/m16-2/mega16:nightmare:2/native-w1",
        "verdict": "identity-ok",
        "problems": [],
        "differing": [],
        "puzzleHash": "cc87297a51b08ef12f3da5b982af5e27ac2352443e3588ed0c39f0d6a56a826d",
        "baselinePuzzleHash": "cc87297a51b08ef12f3da5b982af5e27ac2352443e3588ed0c39f0d6a56a826d",
        "scopedDigest": "e86d509bfad1fface7431f32ec491db77aba8723a4fb575740931f6541297060",
        "baselineDigest": "e86d509bfad1fface7431f32ec491db77aba8723a4fb575740931f6541297060"
      },
      {
        "pairId": "IG-S03/sc-m16/mega16:nightmare:3/scoped-attempts-w4",
        "baselineKey": "IG-S02/m16-3/mega16:nightmare:3/native-w1",
        "verdict": "identity-ok",
        "problems": [],
        "differing": [],
        "puzzleHash": "baeff12be70797abc8393e4b5641ab843d5f919f82af8d3eea937b0ca28eade7",
        "baselinePuzzleHash": "baeff12be70797abc8393e4b5641ab843d5f919f82af8d3eea937b0ca28eade7",
        "scopedDigest": "969eb86ca7b4705c1fd99bf9194818c41153f8e49d4a2b90babca56169ad8d19",
        "baselineDigest": "969eb86ca7b4705c1fd99bf9194818c41153f8e49d4a2b90babca56169ad8d19"
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
      "key": "IG-S03/sc-m16/mega16:nightmare:1/scoped-attempts-w4",
      "stats": {
        "messages": 2,
        "solve": {
          "solvesBegun": 2826,
          "stepsApplied": 360339,
          "cellsInvalidated": 11711066,
          "unitsInvalidated": 11562544,
          "applyCalls": 0
        },
        "finders": {
          "nakedSingle": {
            "calls": 361092,
            "scopesVisited": 65982772,
            "realScopes": 9339765,
            "negativeRecorded": 9130984,
            "positiveScopes": 208781,
            "skippedScopes": 56643007,
            "enumNodesReal": 0,
            "enumNodesSkipped": 0,
            "realEntryChecks": 0,
            "virtualEntryChecks": 0,
            "realNodeChecks": 0,
            "virtualNodeChecks": 0,
            "nativeFallbackCalls": 0
          },
          "hiddenSingleBox": {
            "calls": 152311,
            "scopesVisited": 1948517,
            "realScopes": 592397,
            "negativeRecorded": 527823,
            "positiveScopes": 64574,
            "skippedScopes": 1356120,
            "enumNodesReal": 0,
            "enumNodesSkipped": 0,
            "realEntryChecks": 0,
            "virtualEntryChecks": 0,
            "realNodeChecks": 0,
            "virtualNodeChecks": 0,
            "nativeFallbackCalls": 0
          },
          "hiddenSingleLine": {
            "calls": 87737,
            "scopesVisited": 2558008,
            "realScopes": 860601,
            "negativeRecorded": 844961,
            "positiveScopes": 15640,
            "skippedScopes": 1697407,
            "enumNodesReal": 0,
            "enumNodesSkipped": 0,
            "realEntryChecks": 0,
            "virtualEntryChecks": 0,
            "realNodeChecks": 0,
            "virtualNodeChecks": 0,
            "nativeFallbackCalls": 0
          },
          "nakedPair": {
            "calls": 44282,
            "scopesVisited": 2013497,
            "realScopes": 616419,
            "negativeRecorded": 612530,
            "positiveScopes": 3889,
            "skippedScopes": 1397076,
            "enumNodesReal": 2092396,
            "enumNodesSkipped": 5062326,
            "realEntryChecks": 616419,
            "virtualEntryChecks": 1397076,
            "realNodeChecks": 1536,
            "virtualNodeChecks": 5812,
            "nativeFallbackCalls": 0
          },
          "hiddenPair": {
            "calls": 40391,
            "scopesVisited": 1837320,
            "realScopes": 555265,
            "negativeRecorded": 551850,
            "positiveScopes": 3415,
            "skippedScopes": 1282054,
            "enumNodesReal": 2513162,
            "enumNodesSkipped": 5908194,
            "realEntryChecks": 555265,
            "virtualEntryChecks": 1282054,
            "realNodeChecks": 2723,
            "virtualNodeChecks": 9119,
            "nativeFallbackCalls": 0
          },
          "nakedTriple": {
            "calls": 36975,
            "scopesVisited": 1743825,
            "realScopes": 522144,
            "negativeRecorded": 520970,
            "positiveScopes": 1174,
            "skippedScopes": 1221680,
            "enumNodesReal": 4484773,
            "enumNodesSkipped": 10177726,
            "realEntryChecks": 522144,
            "virtualEntryChecks": 1221680,
            "realNodeChecks": 10993,
            "virtualNodeChecks": 27691,
            "nativeFallbackCalls": 0
          },
          "hiddenTriple": {
            "calls": 35800,
            "scopesVisited": 1700211,
            "realScopes": 508073,
            "negativeRecorded": 507348,
            "positiveScopes": 725,
            "skippedScopes": 1192137,
            "enumNodesReal": 4641790,
            "enumNodesSkipped": 10565668,
            "realEntryChecks": 508073,
            "virtualEntryChecks": 1192137,
            "realNodeChecks": 11843,
            "virtualNodeChecks": 29353,
            "nativeFallbackCalls": 0
          },
          "nakedQuad": {
            "calls": 35074,
            "scopesVisited": 1672708,
            "realScopes": 498358,
            "negativeRecorded": 497886,
            "positiveScopes": 472,
            "skippedScopes": 1174350,
            "enumNodesReal": 7683091,
            "enumNodesSkipped": 16761977,
            "realEntryChecks": 498358,
            "virtualEntryChecks": 1174350,
            "realNodeChecks": 23814,
            "virtualNodeChecks": 54421,
            "nativeFallbackCalls": 0
          },
          "hiddenQuad": {
            "calls": 34602,
            "scopesVisited": 1658203,
            "realScopes": 493779,
            "negativeRecorded": 493623,
            "positiveScopes": 156,
            "skippedScopes": 1164424,
            "enumNodesReal": 7043477,
            "enumNodesSkipped": 15488024,
            "realEntryChecks": 493779,
            "virtualEntryChecks": 1164424,
            "realNodeChecks": 21344,
            "virtualNodeChecks": 49522,
            "nativeFallbackCalls": 0
          }
        },
        "fallbackReasons": {},
        "violations": 0
      },
      "note": "summed over the pipeline runs that finished in the pool workers (consumed and speculative completed attempts); an attempt terminated before its end reports none"
    },
    {
      "key": "IG-S03/sc-m16/mega16:nightmare:2/scoped-attempts-w4",
      "stats": {
        "messages": 2,
        "solve": {
          "solvesBegun": 2851,
          "stepsApplied": 365163,
          "cellsInvalidated": 11915694,
          "unitsInvalidated": 11762413,
          "applyCalls": 0
        },
        "finders": {
          "nakedSingle": {
            "calls": 365862,
            "scopesVisited": 66751556,
            "realScopes": 9538939,
            "negativeRecorded": 9326398,
            "positiveScopes": 212541,
            "skippedScopes": 57212617,
            "enumNodesReal": 0,
            "enumNodesSkipped": 0,
            "realEntryChecks": 0,
            "virtualEntryChecks": 0,
            "realNodeChecks": 0,
            "virtualNodeChecks": 0,
            "nativeFallbackCalls": 0
          },
          "hiddenSingleBox": {
            "calls": 153321,
            "scopesVisited": 1949019,
            "realScopes": 595296,
            "negativeRecorded": 529432,
            "positiveScopes": 65864,
            "skippedScopes": 1353723,
            "enumNodesReal": 0,
            "enumNodesSkipped": 0,
            "realEntryChecks": 0,
            "virtualEntryChecks": 0,
            "realNodeChecks": 0,
            "virtualNodeChecks": 0,
            "nativeFallbackCalls": 0
          },
          "hiddenSingleLine": {
            "calls": 87457,
            "scopesVisited": 2545725,
            "realScopes": 864045,
            "negativeRecorded": 848238,
            "positiveScopes": 15807,
            "skippedScopes": 1681680,
            "enumNodesReal": 0,
            "enumNodesSkipped": 0,
            "realEntryChecks": 0,
            "virtualEntryChecks": 0,
            "realNodeChecks": 0,
            "virtualNodeChecks": 0,
            "nativeFallbackCalls": 0
          },
          "nakedPair": {
            "calls": 41861,
            "scopesVisited": 1885944,
            "realScopes": 622034,
            "negativeRecorded": 617594,
            "positiveScopes": 4440,
            "skippedScopes": 1263909,
            "enumNodesReal": 2084741,
            "enumNodesSkipped": 4688129,
            "realEntryChecks": 622034,
            "virtualEntryChecks": 1263909,
            "realNodeChecks": 1373,
            "virtualNodeChecks": 5209,
            "nativeFallbackCalls": 0
          },
          "hiddenPair": {
            "calls": 37420,
            "scopesVisited": 1707452,
            "realScopes": 555820,
            "negativeRecorded": 552692,
            "positiveScopes": 3128,
            "skippedScopes": 1151632,
            "enumNodesReal": 2445448,
            "enumNodesSkipped": 5331966,
            "realEntryChecks": 555820,
            "virtualEntryChecks": 1151632,
            "realNodeChecks": 2211,
            "virtualNodeChecks": 7520,
            "nativeFallbackCalls": 0
          },
          "nakedTriple": {
            "calls": 34292,
            "scopesVisited": 1612529,
            "realScopes": 521707,
            "negativeRecorded": 520415,
            "positiveScopes": 1292,
            "skippedScopes": 1090822,
            "enumNodesReal": 4446531,
            "enumNodesSkipped": 9370876,
            "realEntryChecks": 521707,
            "virtualEntryChecks": 1090822,
            "realNodeChecks": 11037,
            "virtualNodeChecks": 26076,
            "nativeFallbackCalls": 0
          },
          "hiddenTriple": {
            "calls": 33000,
            "scopesVisited": 1565388,
            "realScopes": 506557,
            "negativeRecorded": 505881,
            "positiveScopes": 676,
            "skippedScopes": 1058830,
            "enumNodesReal": 4528496,
            "enumNodesSkipped": 9460672,
            "realEntryChecks": 506557,
            "virtualEntryChecks": 1058830,
            "realNodeChecks": 11492,
            "virtualNodeChecks": 26862,
            "nativeFallbackCalls": 0
          },
          "nakedQuad": {
            "calls": 32323,
            "scopesVisited": 1543951,
            "realScopes": 499390,
            "negativeRecorded": 499031,
            "positiveScopes": 359,
            "skippedScopes": 1044561,
            "enumNodesReal": 7452907,
            "enumNodesSkipped": 14941589,
            "realEntryChecks": 499390,
            "virtualEntryChecks": 1044561,
            "realNodeChecks": 22839,
            "virtualNodeChecks": 48695,
            "nativeFallbackCalls": 0
          },
          "hiddenQuad": {
            "calls": 31964,
            "scopesVisited": 1531874,
            "realScopes": 494646,
            "negativeRecorded": 494537,
            "positiveScopes": 109,
            "skippedScopes": 1037227,
            "enumNodesReal": 6825846,
            "enumNodesSkipped": 13676701,
            "realEntryChecks": 494646,
            "virtualEntryChecks": 1037227,
            "realNodeChecks": 20552,
            "virtualNodeChecks": 43617,
            "nativeFallbackCalls": 0
          }
        },
        "fallbackReasons": {},
        "violations": 0
      },
      "note": "summed over the pipeline runs that finished in the pool workers (consumed and speculative completed attempts); an attempt terminated before its end reports none"
    },
    {
      "key": "IG-S03/sc-m16/mega16:nightmare:3/scoped-attempts-w4",
      "stats": {
        "messages": 2,
        "solve": {
          "solvesBegun": 2814,
          "stepsApplied": 356700,
          "cellsInvalidated": 11728424,
          "unitsInvalidated": 11570146,
          "applyCalls": 0
        },
        "finders": {
          "nakedSingle": {
            "calls": 357432,
            "scopesVisited": 65641531,
            "realScopes": 9421384,
            "negativeRecorded": 9217241,
            "positiveScopes": 204143,
            "skippedScopes": 56220147,
            "enumNodesReal": 0,
            "enumNodesSkipped": 0,
            "realEntryChecks": 0,
            "virtualEntryChecks": 0,
            "realNodeChecks": 0,
            "virtualNodeChecks": 0,
            "nativeFallbackCalls": 0
          },
          "hiddenSingleBox": {
            "calls": 153289,
            "scopesVisited": 1933316,
            "realScopes": 603474,
            "negativeRecorded": 534856,
            "positiveScopes": 68618,
            "skippedScopes": 1329842,
            "enumNodesReal": 0,
            "enumNodesSkipped": 0,
            "realEntryChecks": 0,
            "virtualEntryChecks": 0,
            "realNodeChecks": 0,
            "virtualNodeChecks": 0,
            "nativeFallbackCalls": 0
          },
          "hiddenSingleLine": {
            "calls": 84671,
            "scopesVisited": 2442166,
            "realScopes": 829918,
            "negativeRecorded": 813110,
            "positiveScopes": 16808,
            "skippedScopes": 1612248,
            "enumNodesReal": 0,
            "enumNodesSkipped": 0,
            "realEntryChecks": 0,
            "virtualEntryChecks": 0,
            "realNodeChecks": 0,
            "virtualNodeChecks": 0,
            "nativeFallbackCalls": 0
          },
          "nakedPair": {
            "calls": 42180,
            "scopesVisited": 1915961,
            "realScopes": 594050,
            "negativeRecorded": 590497,
            "positiveScopes": 3553,
            "skippedScopes": 1321909,
            "enumNodesReal": 2117648,
            "enumNodesSkipped": 4994410,
            "realEntryChecks": 594050,
            "virtualEntryChecks": 1321909,
            "realNodeChecks": 1641,
            "virtualNodeChecks": 6566,
            "nativeFallbackCalls": 0
          },
          "hiddenPair": {
            "calls": 38625,
            "scopesVisited": 1741186,
            "realScopes": 538391,
            "negativeRecorded": 534648,
            "positiveScopes": 3743,
            "skippedScopes": 1202795,
            "enumNodesReal": 2449679,
            "enumNodesSkipped": 5585484,
            "realEntryChecks": 538391,
            "virtualEntryChecks": 1202795,
            "realNodeChecks": 2516,
            "virtualNodeChecks": 8513,
            "nativeFallbackCalls": 0
          },
          "nakedTriple": {
            "calls": 34882,
            "scopesVisited": 1651448,
            "realScopes": 509279,
            "negativeRecorded": 508327,
            "positiveScopes": 952,
            "skippedScopes": 1142166,
            "enumNodesReal": 4386304,
            "enumNodesSkipped": 9802627,
            "realEntryChecks": 509279,
            "virtualEntryChecks": 1142166,
            "realNodeChecks": 10925,
            "virtualNodeChecks": 27273,
            "nativeFallbackCalls": 0
          },
          "hiddenTriple": {
            "calls": 33927,
            "scopesVisited": 1610009,
            "realScopes": 495832,
            "negativeRecorded": 495009,
            "positiveScopes": 823,
            "skippedScopes": 1114176,
            "enumNodesReal": 4388111,
            "enumNodesSkipped": 9812604,
            "realEntryChecks": 495832,
            "virtualEntryChecks": 1114176,
            "realNodeChecks": 11456,
            "virtualNodeChecks": 27334,
            "nativeFallbackCalls": 0
          },
          "nakedQuad": {
            "calls": 33103,
            "scopesVisited": 1584088,
            "realScopes": 484270,
            "negativeRecorded": 484036,
            "positiveScopes": 234,
            "skippedScopes": 1099816,
            "enumNodesReal": 7136544,
            "enumNodesSkipped": 15623959,
            "realEntryChecks": 484270,
            "virtualEntryChecks": 1099816,
            "realNodeChecks": 22076,
            "virtualNodeChecks": 50330,
            "nativeFallbackCalls": 0
          },
          "hiddenQuad": {
            "calls": 32867,
            "scopesVisited": 1573230,
            "realScopes": 481423,
            "negativeRecorded": 481201,
            "positiveScopes": 222,
            "skippedScopes": 1091807,
            "enumNodesReal": 6563524,
            "enumNodesSkipped": 14439306,
            "realEntryChecks": 481423,
            "virtualEntryChecks": 1091807,
            "realNodeChecks": 19780,
            "virtualNodeChecks": 46074,
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
    "wallMs": 103.1105,
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
      "IG-S03/sc-m16/mega16:nightmare:1/scoped-attempts-w4",
      "IG-S03/sc-m16/mega16:nightmare:2/scoped-attempts-w4",
      "IG-S03/sc-m16/mega16:nightmare:3/scoped-attempts-w4"
    ],
    "rerunKeys": [],
    "noRerun": true,
    "unstartedAfter": []
  }
}
```
