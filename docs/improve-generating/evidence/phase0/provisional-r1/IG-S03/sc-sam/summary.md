# IG-S03 / sc-sam (provisional-r1, a1)

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
| samurai:nightmare:1 | n/a | n/a | n/a | 14527.085 | 14653.374 | 28390 | n/a | n/a | n/a |
| samurai:nightmare:2 | n/a | n/a | n/a | 13395.876 | 13507.669 | 26375 | n/a | n/a | n/a |
| samurai:nightmare:42 | n/a | n/a | n/a | 13015.590 | 13128.236 | 23125 | n/a | n/a | n/a |

## Arm: prototype

| metric | n | p50 | p95 | max | upper median |
|---|---|---|---|---|---|
| ready wall ms | 3 | 13395.876 | 14527.085 | 14527.085 | 13395.876 |
| cold wall ms | 3 | 13507.669 | 14653.374 | 14653.374 | 13507.669 |
| cpu total ms | 3 | 26375 | 28390 | 28390 | 26375 |

Requests 3, complete 3, censored 0, errors 0, validation unknown 0, unstarted 0. Verified hits 0; per CPU second 0 (all spent CPU 77890 ms, resolved); per cold wall second 0 (all spent wall 41327.970 ms). With few requests p95 is the observed maximum.

Spent generation work behind the rates (completed, censored, error and validation-unknown requests all count):

| category | requests | cpu ms | wall ms (cold + cleanup) |
|---|---|---|---|
| complete | 3 | 77890 | 41327.970 |
| censored | 0 | 0 | 0 |
| errors | 0 | 0 | 0 |
| validationUnknown | 0 | 0 | 0 |
| total | 3 | 77890 | 41327.970 |

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
        "pairId": "IG-S03/sc-sam/samurai:nightmare:1/scoped-attempts-w4",
        "baselineKey": "IG-S02/sam/samurai:nightmare:1/native-w1",
        "verdict": "identity-ok",
        "problems": [],
        "differing": [],
        "puzzleHash": "f98f3e849c6aa099717fb2d5d7455b5777f03b0ccca5e56c65a7e137acf649f6",
        "baselinePuzzleHash": "f98f3e849c6aa099717fb2d5d7455b5777f03b0ccca5e56c65a7e137acf649f6",
        "scopedDigest": "26f865482e18b243d16f11c690023463e50607597bb004d7b476749b2ab5241b",
        "baselineDigest": "26f865482e18b243d16f11c690023463e50607597bb004d7b476749b2ab5241b"
      },
      {
        "pairId": "IG-S03/sc-sam/samurai:nightmare:2/scoped-attempts-w4",
        "baselineKey": "IG-S02/sam/samurai:nightmare:2/native-w1",
        "verdict": "identity-ok",
        "problems": [],
        "differing": [],
        "puzzleHash": "b6231fc3ecf400a79990bd7f249fe22d4599f9ba8e0dc9ef6b0fdea381d37102",
        "baselinePuzzleHash": "b6231fc3ecf400a79990bd7f249fe22d4599f9ba8e0dc9ef6b0fdea381d37102",
        "scopedDigest": "468ffd63d09093251fde79398b25a43d1019a4e928292ff54dcdb6c414ae56ff",
        "baselineDigest": "468ffd63d09093251fde79398b25a43d1019a4e928292ff54dcdb6c414ae56ff"
      },
      {
        "pairId": "IG-S03/sc-sam/samurai:nightmare:42/scoped-attempts-w4",
        "baselineKey": "IG-S02/sam/samurai:nightmare:42/native-w1",
        "verdict": "identity-ok",
        "problems": [],
        "differing": [],
        "puzzleHash": "a79c68ee57d91e728c84a001b5de18b4d95db170f2b3461c92afad9c909bb587",
        "baselinePuzzleHash": "a79c68ee57d91e728c84a001b5de18b4d95db170f2b3461c92afad9c909bb587",
        "scopedDigest": "95955fe0e5d55620af7fe78d7227be736d2e0662eee3006ea1b331e112920821",
        "baselineDigest": "95955fe0e5d55620af7fe78d7227be736d2e0662eee3006ea1b331e112920821"
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
      "key": "IG-S03/sc-sam/samurai:nightmare:1/scoped-attempts-w4",
      "stats": {
        "messages": 2,
        "solve": {
          "solvesBegun": 6576,
          "stepsApplied": 1363186,
          "cellsInvalidated": 29355792,
          "unitsInvalidated": 39089039,
          "applyCalls": 0
        },
        "finders": {
          "nakedSingle": {
            "calls": 1364518,
            "scopesVisited": 287490102,
            "realScopes": 21144119,
            "negativeRecorded": 19963250,
            "positiveScopes": 1180869,
            "skippedScopes": 266345983,
            "enumNodesReal": 0,
            "enumNodesSkipped": 0,
            "realEntryChecks": 0,
            "virtualEntryChecks": 0,
            "realNodeChecks": 0,
            "virtualNodeChecks": 0,
            "nativeFallbackCalls": 0
          },
          "hiddenSingleBox": {
            "calls": 183649,
            "scopesVisited": 5626468,
            "realScopes": 883162,
            "negativeRecorded": 778255,
            "positiveScopes": 104907,
            "skippedScopes": 4743306,
            "enumNodesReal": 0,
            "enumNodesSkipped": 0,
            "realEntryChecks": 0,
            "virtualEntryChecks": 0,
            "realNodeChecks": 0,
            "virtualNodeChecks": 0,
            "nativeFallbackCalls": 0
          },
          "hiddenSingleLine": {
            "calls": 78742,
            "scopesVisited": 6218673,
            "realScopes": 1044485,
            "negativeRecorded": 1023216,
            "positiveScopes": 21269,
            "skippedScopes": 5174188,
            "enumNodesReal": 0,
            "enumNodesSkipped": 0,
            "realEntryChecks": 0,
            "virtualEntryChecks": 0,
            "realNodeChecks": 0,
            "virtualNodeChecks": 0,
            "nativeFallbackCalls": 0
          },
          "nakedPair": {
            "calls": 26671,
            "scopesVisited": 3271119,
            "realScopes": 724784,
            "negativeRecorded": 720050,
            "positiveScopes": 4734,
            "skippedScopes": 2546334,
            "enumNodesReal": 1343425,
            "enumNodesSkipped": 4336576,
            "realEntryChecks": 724784,
            "virtualEntryChecks": 2546334,
            "realNodeChecks": 1871,
            "virtualNodeChecks": 8813,
            "nativeFallbackCalls": 0
          },
          "hiddenPair": {
            "calls": 21936,
            "scopesVisited": 2781934,
            "realScopes": 677690,
            "negativeRecorded": 675019,
            "positiveScopes": 2671,
            "skippedScopes": 2104243,
            "enumNodesReal": 1386042,
            "enumNodesSkipped": 4151798,
            "realEntryChecks": 677690,
            "virtualEntryChecks": 2104243,
            "realNodeChecks": 2645,
            "virtualNodeChecks": 9970,
            "nativeFallbackCalls": 0
          },
          "nakedTriple": {
            "calls": 19264,
            "scopesVisited": 2550833,
            "realScopes": 659390,
            "negativeRecorded": 658616,
            "positiveScopes": 774,
            "skippedScopes": 1891442,
            "enumNodesReal": 1988184,
            "enumNodesSkipped": 5630353,
            "realEntryChecks": 659390,
            "virtualEntryChecks": 1891442,
            "realNodeChecks": 4392,
            "virtualNodeChecks": 16277,
            "nativeFallbackCalls": 0
          },
          "hiddenTriple": {
            "calls": 18489,
            "scopesVisited": 2479727,
            "realScopes": 652366,
            "negativeRecorded": 652198,
            "positiveScopes": 168,
            "skippedScopes": 1827361,
            "enumNodesReal": 1871461,
            "enumNodesSkipped": 5264594,
            "realEntryChecks": 652366,
            "virtualEntryChecks": 1827361,
            "realNodeChecks": 3792,
            "virtualNodeChecks": 15415,
            "nativeFallbackCalls": 0
          },
          "nakedQuad": {
            "calls": 18321,
            "scopesVisited": 2472288,
            "realScopes": 651573,
            "negativeRecorded": 651561,
            "positiveScopes": 12,
            "skippedScopes": 1820714,
            "enumNodesReal": 2200465,
            "enumNodesSkipped": 6258537,
            "realEntryChecks": 651573,
            "virtualEntryChecks": 1820714,
            "realNodeChecks": 5857,
            "virtualNodeChecks": 18769,
            "nativeFallbackCalls": 0
          },
          "hiddenQuad": {
            "calls": 18308,
            "scopesVisited": 2471580,
            "realScopes": 651530,
            "negativeRecorded": 651530,
            "positiveScopes": 0,
            "skippedScopes": 1820050,
            "enumNodesReal": 1921620,
            "enumNodesSkipped": 5422842,
            "realEntryChecks": 651530,
            "virtualEntryChecks": 1820050,
            "realNodeChecks": 4407,
            "virtualNodeChecks": 16484,
            "nativeFallbackCalls": 0
          }
        },
        "fallbackReasons": {},
        "violations": 0
      },
      "note": "summed over the pipeline runs that finished in the pool workers (consumed and speculative completed attempts); an attempt terminated before its end reports none"
    },
    {
      "key": "IG-S03/sc-sam/samurai:nightmare:2/scoped-attempts-w4",
      "stats": {
        "messages": 2,
        "solve": {
          "solvesBegun": 6670,
          "stepsApplied": 1400163,
          "cellsInvalidated": 30043102,
          "unitsInvalidated": 39827107,
          "applyCalls": 0
        },
        "finders": {
          "nakedSingle": {
            "calls": 1401110,
            "scopesVisited": 298440822,
            "realScopes": 21833805,
            "negativeRecorded": 20641815,
            "positiveScopes": 1191990,
            "skippedScopes": 276607017,
            "enumNodesReal": 0,
            "enumNodesSkipped": 0,
            "realEntryChecks": 0,
            "virtualEntryChecks": 0,
            "realNodeChecks": 0,
            "virtualNodeChecks": 0,
            "nativeFallbackCalls": 0
          },
          "hiddenSingleBox": {
            "calls": 209120,
            "scopesVisited": 6154318,
            "realScopes": 976396,
            "negativeRecorded": 847428,
            "positiveScopes": 128968,
            "skippedScopes": 5177922,
            "enumNodesReal": 0,
            "enumNodesSkipped": 0,
            "realEntryChecks": 0,
            "virtualEntryChecks": 0,
            "realNodeChecks": 0,
            "virtualNodeChecks": 0,
            "nativeFallbackCalls": 0
          },
          "hiddenSingleLine": {
            "calls": 80152,
            "scopesVisited": 6262787,
            "realScopes": 1047299,
            "negativeRecorded": 1025051,
            "positiveScopes": 22248,
            "skippedScopes": 5215488,
            "enumNodesReal": 0,
            "enumNodesSkipped": 0,
            "realEntryChecks": 0,
            "virtualEntryChecks": 0,
            "realNodeChecks": 0,
            "virtualNodeChecks": 0,
            "nativeFallbackCalls": 0
          },
          "nakedPair": {
            "calls": 24313,
            "scopesVisited": 2923293,
            "realScopes": 701917,
            "negativeRecorded": 697262,
            "positiveScopes": 4655,
            "skippedScopes": 2221376,
            "enumNodesReal": 1294499,
            "enumNodesSkipped": 3875923,
            "realEntryChecks": 701917,
            "virtualEntryChecks": 2221376,
            "realNodeChecks": 2143,
            "virtualNodeChecks": 7554,
            "nativeFallbackCalls": 0
          },
          "hiddenPair": {
            "calls": 19658,
            "scopesVisited": 2495595,
            "realScopes": 652289,
            "negativeRecorded": 649945,
            "positiveScopes": 2344,
            "skippedScopes": 1843306,
            "enumNodesReal": 1344751,
            "enumNodesSkipped": 3805379,
            "realEntryChecks": 652289,
            "virtualEntryChecks": 1843306,
            "realNodeChecks": 2687,
            "virtualNodeChecks": 8652,
            "nativeFallbackCalls": 0
          },
          "nakedTriple": {
            "calls": 17314,
            "scopesVisited": 2300606,
            "realScopes": 623444,
            "negativeRecorded": 622906,
            "positiveScopes": 538,
            "skippedScopes": 1677161,
            "enumNodesReal": 1979243,
            "enumNodesSkipped": 5570136,
            "realEntryChecks": 623444,
            "virtualEntryChecks": 1677161,
            "realNodeChecks": 4921,
            "virtualNodeChecks": 16019,
            "nativeFallbackCalls": 0
          },
          "hiddenTriple": {
            "calls": 16775,
            "scopesVisited": 2256131,
            "realScopes": 616856,
            "negativeRecorded": 616668,
            "positiveScopes": 188,
            "skippedScopes": 1639275,
            "enumNodesReal": 1864479,
            "enumNodesSkipped": 5188762,
            "realEntryChecks": 616856,
            "virtualEntryChecks": 1639275,
            "realNodeChecks": 4535,
            "virtualNodeChecks": 14882,
            "nativeFallbackCalls": 0
          },
          "nakedQuad": {
            "calls": 16587,
            "scopesVisited": 2238770,
            "realScopes": 616075,
            "negativeRecorded": 616070,
            "positiveScopes": 5,
            "skippedScopes": 1622694,
            "enumNodesReal": 2180590,
            "enumNodesSkipped": 6212575,
            "realEntryChecks": 616075,
            "virtualEntryChecks": 1622694,
            "realNodeChecks": 5744,
            "virtualNodeChecks": 19286,
            "nativeFallbackCalls": 0
          },
          "hiddenQuad": {
            "calls": 16581,
            "scopesVisited": 2238299,
            "realScopes": 616032,
            "negativeRecorded": 616032,
            "positiveScopes": 0,
            "skippedScopes": 1622265,
            "enumNodesReal": 1981492,
            "enumNodesSkipped": 5511138,
            "realEntryChecks": 616032,
            "virtualEntryChecks": 1622265,
            "realNodeChecks": 4840,
            "virtualNodeChecks": 16287,
            "nativeFallbackCalls": 0
          }
        },
        "fallbackReasons": {},
        "violations": 0
      },
      "note": "summed over the pipeline runs that finished in the pool workers (consumed and speculative completed attempts); an attempt terminated before its end reports none"
    },
    {
      "key": "IG-S03/sc-sam/samurai:nightmare:42/scoped-attempts-w4",
      "stats": {
        "messages": 2,
        "solve": {
          "solvesBegun": 6695,
          "stepsApplied": 1395986,
          "cellsInvalidated": 30125113,
          "unitsInvalidated": 40024181,
          "applyCalls": 0
        },
        "finders": {
          "nakedSingle": {
            "calls": 1396926,
            "scopesVisited": 296645975,
            "realScopes": 21837624,
            "negativeRecorded": 20634906,
            "positiveScopes": 1202718,
            "skippedScopes": 274808351,
            "enumNodesReal": 0,
            "enumNodesSkipped": 0,
            "realEntryChecks": 0,
            "virtualEntryChecks": 0,
            "realNodeChecks": 0,
            "virtualNodeChecks": 0,
            "nativeFallbackCalls": 0
          },
          "hiddenSingleBox": {
            "calls": 194208,
            "scopesVisited": 5702586,
            "realScopes": 931771,
            "negativeRecorded": 813669,
            "positiveScopes": 118102,
            "skippedScopes": 4770815,
            "enumNodesReal": 0,
            "enumNodesSkipped": 0,
            "realEntryChecks": 0,
            "virtualEntryChecks": 0,
            "realNodeChecks": 0,
            "virtualNodeChecks": 0,
            "nativeFallbackCalls": 0
          },
          "hiddenSingleLine": {
            "calls": 76106,
            "scopesVisited": 5718298,
            "realScopes": 1012676,
            "negativeRecorded": 988288,
            "positiveScopes": 24388,
            "skippedScopes": 4705622,
            "enumNodesReal": 0,
            "enumNodesSkipped": 0,
            "realEntryChecks": 0,
            "virtualEntryChecks": 0,
            "realNodeChecks": 0,
            "virtualNodeChecks": 0,
            "nativeFallbackCalls": 0
          },
          "nakedPair": {
            "calls": 21343,
            "scopesVisited": 2577131,
            "realScopes": 618410,
            "negativeRecorded": 614730,
            "positiveScopes": 3680,
            "skippedScopes": 1958721,
            "enumNodesReal": 1037365,
            "enumNodesSkipped": 2788228,
            "realEntryChecks": 618410,
            "virtualEntryChecks": 1958721,
            "realNodeChecks": 1132,
            "virtualNodeChecks": 5228,
            "nativeFallbackCalls": 0
          },
          "hiddenPair": {
            "calls": 17663,
            "scopesVisited": 2258811,
            "realScopes": 584782,
            "negativeRecorded": 582974,
            "positiveScopes": 1808,
            "skippedScopes": 1674028,
            "enumNodesReal": 1071765,
            "enumNodesSkipped": 2670694,
            "realEntryChecks": 584782,
            "virtualEntryChecks": 1674028,
            "realNodeChecks": 1621,
            "virtualNodeChecks": 5582,
            "nativeFallbackCalls": 0
          },
          "nakedTriple": {
            "calls": 15854,
            "scopesVisited": 2094717,
            "realScopes": 562665,
            "negativeRecorded": 562065,
            "positiveScopes": 600,
            "skippedScopes": 1532052,
            "enumNodesReal": 1500723,
            "enumNodesSkipped": 3733341,
            "realEntryChecks": 562665,
            "virtualEntryChecks": 1532052,
            "realNodeChecks": 2376,
            "virtualNodeChecks": 10192,
            "nativeFallbackCalls": 0
          },
          "hiddenTriple": {
            "calls": 15254,
            "scopesVisited": 2055175,
            "realScopes": 559036,
            "negativeRecorded": 558992,
            "positiveScopes": 44,
            "skippedScopes": 1496137,
            "enumNodesReal": 1415658,
            "enumNodesSkipped": 3493076,
            "realEntryChecks": 559036,
            "virtualEntryChecks": 1496137,
            "realNodeChecks": 2134,
            "virtualNodeChecks": 8914,
            "nativeFallbackCalls": 0
          },
          "nakedQuad": {
            "calls": 15208,
            "scopesVisited": 2052868,
            "realScopes": 558854,
            "negativeRecorded": 558851,
            "positiveScopes": 3,
            "skippedScopes": 1494014,
            "enumNodesReal": 1622702,
            "enumNodesSkipped": 4107047,
            "realEntryChecks": 558854,
            "virtualEntryChecks": 1494014,
            "realNodeChecks": 3214,
            "virtualNodeChecks": 12237,
            "nativeFallbackCalls": 0
          },
          "hiddenQuad": {
            "calls": 15205,
            "scopesVisited": 2052675,
            "realScopes": 558842,
            "negativeRecorded": 558842,
            "positiveScopes": 0,
            "skippedScopes": 1493833,
            "enumNodesReal": 1416400,
            "enumNodesSkipped": 3580211,
            "realEntryChecks": 558842,
            "virtualEntryChecks": 1493833,
            "realNodeChecks": 2472,
            "virtualNodeChecks": 9838,
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
    "wallMs": 101.09720000000004,
    "cpuMs": 125,
    "note": "unmeasured: loads the engine once per command so no arm carries the catalogue discovery"
  },
  "chain": {
    "attempts": [
      "a1"
    ],
    "resumed": false,
    "startedBefore": [],
    "startedHere": [
      "IG-S03/sc-sam/samurai:nightmare:1/scoped-attempts-w4",
      "IG-S03/sc-sam/samurai:nightmare:2/scoped-attempts-w4",
      "IG-S03/sc-sam/samurai:nightmare:42/scoped-attempts-w4"
    ],
    "rerunKeys": [],
    "noRerun": true,
    "unstartedAfter": []
  }
}
```
