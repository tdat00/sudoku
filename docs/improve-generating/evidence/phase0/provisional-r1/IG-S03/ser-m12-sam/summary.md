# IG-S03 / ser-m12-sam (provisional-r1, a1)

**PROVISIONAL (pre-freeze). Not an offer, qualification or gate result; nothing here enables a cell, selects an allowance or changes a default.**

Evidence status: **provisional (pre-freeze)**. Formal gate: **not-evaluable-pre-freeze**.
Command status: **complete** (exit 0). Estimate verdict: provisional; judged in the task summary against IG-S02's matched baselines.

## Coverage

| planned | completed | censored | errors | unstarted | coverage complete |
|---|---|---|---|---|---|
| 2 | 2 | 0 | 0 | 0 | true |

Exclusions: the baselines are IG-S02's records (not rerun here); audited wall time is not a speed measurement; the unmeasured catalogue probe and the independent audit are outside every generation time; a censored or unverified arm proves neither identity nor speed

## Sources

| item | value |
|---|---|
| runtime label (supplied) | 1c042ad (label supplied by the pack; runtime f7be90f, unchanged by ef8a9cc) |
| runtime fingerprint | 36b2b8327f348fc6fc39471f34608c6679b9f3fc34e48178563cc4424173b50a |
| runtime files | 63 |
| harness fingerprint | baeb9ea2c1ae6477e2b9a83efc57d73975a204b450b95f7b80e76f1706a20944 |
| adapters | scoped-solver |
| sources stable | true |
| firewall clean | true |

CPU: process.cpuUsage (user+system of the host process, worker threads included; read once at the host); observed quantum 16 ms. A value below the quantum is unresolved and gives no rate or factor.

## Paired rows (before = reference, after = prototype)

| pair | ref ready ms | ref cold ms | ref cpu ms | proto ready ms | proto cold ms | proto cpu ms | cpu factor | ready factor | cold factor |
|---|---|---|---|---|---|---|---|---|---|
| mega12:nightmare:3 | n/a | n/a | n/a | 23327.355 | 23425.059 | 24108 | n/a | n/a | n/a |
| samurai:nightmare:42 | n/a | n/a | n/a | 21404.484 | 21498.496 | 22328 | n/a | n/a | n/a |

## Arm: prototype

| metric | n | p50 | p95 | max | upper median |
|---|---|---|---|---|---|
| ready wall ms | 2 | 21404.484 | 23327.355 | 23327.355 | 23327.355 |
| cold wall ms | 2 | 21498.496 | 23425.059 | 23425.059 | 23425.059 |
| cpu total ms | 2 | 22328 | 24108 | 24108 | 24108 |

Requests 2, complete 2, censored 0, errors 0, validation unknown 0, unstarted 0. Verified hits 0; per CPU second 0 (all spent CPU 46436 ms, resolved); per cold wall second 0 (all spent wall 44948.560 ms). With few requests p95 is the observed maximum.

Spent generation work behind the rates (completed, censored, error and validation-unknown requests all count):

| category | requests | cpu ms | wall ms (cold + cleanup) |
|---|---|---|---|
| complete | 2 | 46436 | 44948.560 |
| censored | 0 | 0 | 0 |
| errors | 0 | 0 | 0 |
| validationUnknown | 0 | 0 | 0 |
| total | 2 | 46436 | 44948.560 |

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
        "pairId": "IG-S03/ser-m12-sam/mega12:nightmare:3/scoped-native-w1",
        "baselineKey": "IG-S02/m12/mega12:nightmare:3/native-w1",
        "verdict": "identity-ok",
        "problems": [],
        "differing": [],
        "puzzleHash": "da06846642b580acd05fd918eaaf19348df9a69f7e0e569eac26d50079a386cf",
        "baselinePuzzleHash": "da06846642b580acd05fd918eaaf19348df9a69f7e0e569eac26d50079a386cf",
        "scopedDigest": "31ab8a793ef7db28e5fd6af04df2fb26c03a3f9194409ae3338bf983ff57821a",
        "baselineDigest": "31ab8a793ef7db28e5fd6af04df2fb26c03a3f9194409ae3338bf983ff57821a"
      },
      {
        "pairId": "IG-S03/ser-m12-sam/samurai:nightmare:42/scoped-native-w1",
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
    "ok": 2,
    "notComparable": 0,
    "deferred": 0,
    "complete": true
  },
  "scoped": [
    {
      "key": "IG-S03/ser-m12-sam/mega12:nightmare:3/scoped-native-w1",
      "stats": {
        "messages": 1,
        "solve": {
          "solvesBegun": 5421,
          "stepsApplied": 405840,
          "cellsInvalidated": 10758335,
          "unitsInvalidated": 11204059,
          "applyCalls": 0
        },
        "finders": {
          "nakedSingle": {
            "calls": 406875,
            "scopesVisited": 38354254,
            "realScopes": 8317985,
            "negativeRecorded": 8029281,
            "positiveScopes": 288704,
            "skippedScopes": 30036269,
            "enumNodesReal": 0,
            "enumNodesSkipped": 0,
            "realEntryChecks": 0,
            "virtualEntryChecks": 0,
            "realNodeChecks": 0,
            "virtualNodeChecks": 0,
            "nativeFallbackCalls": 0
          },
          "hiddenSingleBox": {
            "calls": 118171,
            "scopesVisited": 1014417,
            "realScopes": 433550,
            "negativeRecorded": 365880,
            "positiveScopes": 67670,
            "skippedScopes": 580867,
            "enumNodesReal": 0,
            "enumNodesSkipped": 0,
            "realEntryChecks": 0,
            "virtualEntryChecks": 0,
            "realNodeChecks": 0,
            "virtualNodeChecks": 0,
            "nativeFallbackCalls": 0
          },
          "hiddenSingleLine": {
            "calls": 50501,
            "scopesVisited": 1078126,
            "realScopes": 427826,
            "negativeRecorded": 415761,
            "positiveScopes": 12065,
            "skippedScopes": 650300,
            "enumNodesReal": 0,
            "enumNodesSkipped": 0,
            "realEntryChecks": 0,
            "virtualEntryChecks": 0,
            "realNodeChecks": 0,
            "virtualNodeChecks": 0,
            "nativeFallbackCalls": 0
          },
          "nakedPair": {
            "calls": 23224,
            "scopesVisited": 780006,
            "realScopes": 292630,
            "negativeRecorded": 289884,
            "positiveScopes": 2746,
            "skippedScopes": 487376,
            "enumNodesReal": 930783,
            "enumNodesSkipped": 1576446,
            "realEntryChecks": 292630,
            "virtualEntryChecks": 487376,
            "realNodeChecks": 91,
            "virtualNodeChecks": 350,
            "nativeFallbackCalls": 0
          },
          "hiddenPair": {
            "calls": 20478,
            "scopesVisited": 697983,
            "realScopes": 266476,
            "negativeRecorded": 264807,
            "positiveScopes": 1669,
            "skippedScopes": 431507,
            "enumNodesReal": 1015043,
            "enumNodesSkipped": 1629289,
            "realEntryChecks": 266476,
            "virtualEntryChecks": 431507,
            "realNodeChecks": 112,
            "virtualNodeChecks": 404,
            "nativeFallbackCalls": 0
          },
          "nakedTriple": {
            "calls": 18809,
            "scopesVisited": 666762,
            "realScopes": 255342,
            "negativeRecorded": 254784,
            "positiveScopes": 558,
            "skippedScopes": 411420,
            "enumNodesReal": 1697973,
            "enumNodesSkipped": 2688375,
            "realEntryChecks": 255342,
            "virtualEntryChecks": 411420,
            "realNodeChecks": 2144,
            "virtualNodeChecks": 5425,
            "nativeFallbackCalls": 0
          },
          "hiddenTriple": {
            "calls": 18251,
            "scopesVisited": 653466,
            "realScopes": 250757,
            "negativeRecorded": 250575,
            "positiveScopes": 182,
            "skippedScopes": 402709,
            "enumNodesReal": 1603523,
            "enumNodesSkipped": 2544004,
            "realEntryChecks": 250757,
            "virtualEntryChecks": 402709,
            "realNodeChecks": 1723,
            "virtualNodeChecks": 4731,
            "nativeFallbackCalls": 0
          },
          "nakedQuad": {
            "calls": 18069,
            "scopesVisited": 649650,
            "realScopes": 249764,
            "negativeRecorded": 249707,
            "positiveScopes": 57,
            "skippedScopes": 399886,
            "enumNodesReal": 2202832,
            "enumNodesSkipped": 3342451,
            "realEntryChecks": 249764,
            "virtualEntryChecks": 399886,
            "realNodeChecks": 4532,
            "virtualNodeChecks": 8227,
            "nativeFallbackCalls": 0
          },
          "hiddenQuad": {
            "calls": 18012,
            "scopesVisited": 648399,
            "realScopes": 249365,
            "negativeRecorded": 249364,
            "positiveScopes": 1,
            "skippedScopes": 399034,
            "enumNodesReal": 1941751,
            "enumNodesSkipped": 2964155,
            "realEntryChecks": 249365,
            "virtualEntryChecks": 399034,
            "realNodeChecks": 3610,
            "virtualNodeChecks": 6923,
            "nativeFallbackCalls": 0
          }
        },
        "fallbackReasons": {},
        "violations": 0
      },
      "note": "summed over the one pipeline run of the request"
    },
    {
      "key": "IG-S03/ser-m12-sam/samurai:nightmare:42/scoped-native-w1",
      "stats": {
        "messages": 1,
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
      "note": "summed over the one pipeline run of the request"
    }
  ],
  "audits": [],
  "catalogueProbe": {
    "wallMs": 102.62250000000006,
    "cpuMs": 95,
    "note": "unmeasured: loads the engine once per command so no arm carries the catalogue discovery"
  },
  "chain": {
    "attempts": [
      "a1"
    ],
    "resumed": false,
    "startedBefore": [],
    "startedHere": [
      "IG-S03/ser-m12-sam/mega12:nightmare:3/scoped-native-w1",
      "IG-S03/ser-m12-sam/samurai:nightmare:42/scoped-native-w1"
    ],
    "rerunKeys": [],
    "noRerun": true,
    "unstartedAfter": []
  }
}
```
