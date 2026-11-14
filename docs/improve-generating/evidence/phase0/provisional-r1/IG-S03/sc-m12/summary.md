# IG-S03 / sc-m12 (provisional-r1, a1)

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
| mega12:nightmare:1 | n/a | n/a | n/a | 7915.172 | 8056.103 | 27047 | n/a | n/a | n/a |
| mega12:nightmare:2 | n/a | n/a | n/a | 6804.084 | 6922.727 | 25626 | n/a | n/a | n/a |
| mega12:nightmare:3 | n/a | n/a | n/a | 6724.493 | 6846.223 | 25859 | n/a | n/a | n/a |

## Arm: prototype

| metric | n | p50 | p95 | max | upper median |
|---|---|---|---|---|---|
| ready wall ms | 3 | 6804.084 | 7915.172 | 7915.172 | 6804.084 |
| cold wall ms | 3 | 6922.727 | 8056.103 | 8056.103 | 6922.727 |
| cpu total ms | 3 | 25859 | 27047 | 27047 | 25859 |

Requests 3, complete 3, censored 0, errors 0, validation unknown 0, unstarted 0. Verified hits 0; per CPU second 0 (all spent CPU 78532 ms, resolved); per cold wall second 0 (all spent wall 21859.930 ms). With few requests p95 is the observed maximum.

Spent generation work behind the rates (completed, censored, error and validation-unknown requests all count):

| category | requests | cpu ms | wall ms (cold + cleanup) |
|---|---|---|---|
| complete | 3 | 78532 | 21859.930 |
| censored | 0 | 0 | 0 |
| errors | 0 | 0 | 0 |
| validationUnknown | 0 | 0 | 0 |
| total | 3 | 78532 | 21859.930 |

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
        "pairId": "IG-S03/sc-m12/mega12:nightmare:1/scoped-attempts-w4",
        "baselineKey": "IG-S02/m12/mega12:nightmare:1/native-w1",
        "verdict": "identity-ok",
        "problems": [],
        "differing": [],
        "puzzleHash": "290f5389a3e7d5afb4f16a1ea945014c968b9cbb1b472febc662a8f97e5aaad2",
        "baselinePuzzleHash": "290f5389a3e7d5afb4f16a1ea945014c968b9cbb1b472febc662a8f97e5aaad2",
        "scopedDigest": "089a457dfb267ab04472f05b95f7800f7cbbce2ce4fab25b1315f5330fe8a021",
        "baselineDigest": "089a457dfb267ab04472f05b95f7800f7cbbce2ce4fab25b1315f5330fe8a021"
      },
      {
        "pairId": "IG-S03/sc-m12/mega12:nightmare:2/scoped-attempts-w4",
        "baselineKey": "IG-S02/m12/mega12:nightmare:2/native-w1",
        "verdict": "identity-ok",
        "problems": [],
        "differing": [],
        "puzzleHash": "c27720d7a6a903b668cb0fa164c25c5de31fc577013c6437631b1a05ec3f9a85",
        "baselinePuzzleHash": "c27720d7a6a903b668cb0fa164c25c5de31fc577013c6437631b1a05ec3f9a85",
        "scopedDigest": "8d09588a7b1ab2eb56ff890dbc15ad8297957bd84f08e6f2a387fb3ee1b92ffe",
        "baselineDigest": "8d09588a7b1ab2eb56ff890dbc15ad8297957bd84f08e6f2a387fb3ee1b92ffe"
      },
      {
        "pairId": "IG-S03/sc-m12/mega12:nightmare:3/scoped-attempts-w4",
        "baselineKey": "IG-S02/m12/mega12:nightmare:3/native-w1",
        "verdict": "identity-ok",
        "problems": [],
        "differing": [],
        "puzzleHash": "da06846642b580acd05fd918eaaf19348df9a69f7e0e569eac26d50079a386cf",
        "baselinePuzzleHash": "da06846642b580acd05fd918eaaf19348df9a69f7e0e569eac26d50079a386cf",
        "scopedDigest": "31ab8a793ef7db28e5fd6af04df2fb26c03a3f9194409ae3338bf983ff57821a",
        "baselineDigest": "31ab8a793ef7db28e5fd6af04df2fb26c03a3f9194409ae3338bf983ff57821a"
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
      "key": "IG-S03/sc-m12/mega12:nightmare:1/scoped-attempts-w4",
      "stats": {
        "messages": 4,
        "solve": {
          "solvesBegun": 5769,
          "stepsApplied": 445319,
          "cellsInvalidated": 11828928,
          "unitsInvalidated": 12317375,
          "applyCalls": 0
        },
        "finders": {
          "nakedSingle": {
            "calls": 446261,
            "scopesVisited": 41775717,
            "realScopes": 9101130,
            "negativeRecorded": 8782834,
            "positiveScopes": 318296,
            "skippedScopes": 32674587,
            "enumNodesReal": 0,
            "enumNodesSkipped": 0,
            "realEntryChecks": 0,
            "virtualEntryChecks": 0,
            "realNodeChecks": 0,
            "virtualNodeChecks": 0,
            "nativeFallbackCalls": 0
          },
          "hiddenSingleBox": {
            "calls": 127965,
            "scopesVisited": 1104050,
            "realScopes": 468118,
            "negativeRecorded": 393859,
            "positiveScopes": 74259,
            "skippedScopes": 635932,
            "enumNodesReal": 0,
            "enumNodesSkipped": 0,
            "realEntryChecks": 0,
            "virtualEntryChecks": 0,
            "realNodeChecks": 0,
            "virtualNodeChecks": 0,
            "nativeFallbackCalls": 0
          },
          "hiddenSingleLine": {
            "calls": 53706,
            "scopesVisited": 1153729,
            "realScopes": 455587,
            "negativeRecorded": 442978,
            "positiveScopes": 12609,
            "skippedScopes": 698142,
            "enumNodesReal": 0,
            "enumNodesSkipped": 0,
            "realEntryChecks": 0,
            "virtualEntryChecks": 0,
            "realNodeChecks": 0,
            "virtualNodeChecks": 0,
            "nativeFallbackCalls": 0
          },
          "nakedPair": {
            "calls": 25882,
            "scopesVisited": 871485,
            "realScopes": 311803,
            "negativeRecorded": 308995,
            "positiveScopes": 2808,
            "skippedScopes": 559682,
            "enumNodesReal": 905827,
            "enumNodesSkipped": 1601250,
            "realEntryChecks": 311803,
            "virtualEntryChecks": 559682,
            "realNodeChecks": 124,
            "virtualNodeChecks": 378,
            "nativeFallbackCalls": 0
          },
          "hiddenPair": {
            "calls": 23074,
            "scopesVisited": 791864,
            "realScopes": 285535,
            "negativeRecorded": 283844,
            "positiveScopes": 1691,
            "skippedScopes": 506329,
            "enumNodesReal": 1065626,
            "enumNodesSkipped": 1851999,
            "realEntryChecks": 285535,
            "virtualEntryChecks": 506329,
            "realNodeChecks": 135,
            "virtualNodeChecks": 402,
            "nativeFallbackCalls": 0
          },
          "nakedTriple": {
            "calls": 21383,
            "scopesVisited": 759967,
            "realScopes": 274100,
            "negativeRecorded": 273611,
            "positiveScopes": 489,
            "skippedScopes": 485867,
            "enumNodesReal": 1819180,
            "enumNodesSkipped": 3159790,
            "realEntryChecks": 274100,
            "virtualEntryChecks": 485867,
            "realNodeChecks": 2387,
            "virtualNodeChecks": 6203,
            "nativeFallbackCalls": 0
          },
          "hiddenTriple": {
            "calls": 20894,
            "scopesVisited": 746348,
            "realScopes": 269683,
            "negativeRecorded": 269406,
            "positiveScopes": 277,
            "skippedScopes": 476665,
            "enumNodesReal": 1749654,
            "enumNodesSkipped": 3005345,
            "realEntryChecks": 269683,
            "virtualEntryChecks": 476665,
            "realNodeChecks": 1989,
            "virtualNodeChecks": 5154,
            "nativeFallbackCalls": 0
          },
          "nakedQuad": {
            "calls": 20617,
            "scopesVisited": 741445,
            "realScopes": 267915,
            "negativeRecorded": 267871,
            "positiveScopes": 44,
            "skippedScopes": 473530,
            "enumNodesReal": 2489624,
            "enumNodesSkipped": 4237069,
            "realEntryChecks": 267915,
            "virtualEntryChecks": 473530,
            "realNodeChecks": 5627,
            "virtualNodeChecks": 10834,
            "nativeFallbackCalls": 0
          },
          "hiddenQuad": {
            "calls": 20573,
            "scopesVisited": 740603,
            "realScopes": 267600,
            "negativeRecorded": 267598,
            "positiveScopes": 2,
            "skippedScopes": 473003,
            "enumNodesReal": 2191501,
            "enumNodesSkipped": 3681656,
            "realEntryChecks": 267600,
            "virtualEntryChecks": 473003,
            "realNodeChecks": 4253,
            "virtualNodeChecks": 9067,
            "nativeFallbackCalls": 0
          }
        },
        "fallbackReasons": {},
        "violations": 0
      },
      "note": "summed over the pipeline runs that finished in the pool workers (consumed and speculative completed attempts); an attempt terminated before its end reports none"
    },
    {
      "key": "IG-S03/sc-m12/mega12:nightmare:2/scoped-attempts-w4",
      "stats": {
        "messages": 4,
        "solve": {
          "solvesBegun": 5565,
          "stepsApplied": 429762,
          "cellsInvalidated": 11364920,
          "unitsInvalidated": 11838849,
          "applyCalls": 0
        },
        "finders": {
          "nakedSingle": {
            "calls": 430693,
            "scopesVisited": 40580101,
            "realScopes": 8772806,
            "negativeRecorded": 8471372,
            "positiveScopes": 301434,
            "skippedScopes": 31807295,
            "enumNodesReal": 0,
            "enumNodesSkipped": 0,
            "realEntryChecks": 0,
            "virtualEntryChecks": 0,
            "realNodeChecks": 0,
            "virtualNodeChecks": 0,
            "nativeFallbackCalls": 0
          },
          "hiddenSingleBox": {
            "calls": 129259,
            "scopesVisited": 1125869,
            "realScopes": 476208,
            "negativeRecorded": 401147,
            "positiveScopes": 75061,
            "skippedScopes": 649661,
            "enumNodesReal": 0,
            "enumNodesSkipped": 0,
            "realEntryChecks": 0,
            "virtualEntryChecks": 0,
            "realNodeChecks": 0,
            "virtualNodeChecks": 0,
            "nativeFallbackCalls": 0
          },
          "hiddenSingleLine": {
            "calls": 54198,
            "scopesVisited": 1164300,
            "realScopes": 449729,
            "negativeRecorded": 437202,
            "positiveScopes": 12527,
            "skippedScopes": 714571,
            "enumNodesReal": 0,
            "enumNodesSkipped": 0,
            "realEntryChecks": 0,
            "virtualEntryChecks": 0,
            "realNodeChecks": 0,
            "virtualNodeChecks": 0,
            "nativeFallbackCalls": 0
          },
          "nakedPair": {
            "calls": 25113,
            "scopesVisited": 836831,
            "realScopes": 301537,
            "negativeRecorded": 298569,
            "positiveScopes": 2968,
            "skippedScopes": 535294,
            "enumNodesReal": 942037,
            "enumNodesSkipped": 1754699,
            "realEntryChecks": 301537,
            "virtualEntryChecks": 535294,
            "realNodeChecks": 204,
            "virtualNodeChecks": 537,
            "nativeFallbackCalls": 0
          },
          "hiddenPair": {
            "calls": 22145,
            "scopesVisited": 748463,
            "realScopes": 272460,
            "negativeRecorded": 270290,
            "positiveScopes": 2170,
            "skippedScopes": 476003,
            "enumNodesReal": 1047183,
            "enumNodesSkipped": 1903431,
            "realEntryChecks": 272460,
            "virtualEntryChecks": 476003,
            "realNodeChecks": 258,
            "virtualNodeChecks": 606,
            "nativeFallbackCalls": 0
          },
          "nakedTriple": {
            "calls": 19975,
            "scopesVisited": 705971,
            "realScopes": 257837,
            "negativeRecorded": 257107,
            "positiveScopes": 730,
            "skippedScopes": 448134,
            "enumNodesReal": 1733185,
            "enumNodesSkipped": 3087077,
            "realEntryChecks": 257837,
            "virtualEntryChecks": 448134,
            "realNodeChecks": 2459,
            "virtualNodeChecks": 6200,
            "nativeFallbackCalls": 0
          },
          "hiddenTriple": {
            "calls": 19245,
            "scopesVisited": 687996,
            "realScopes": 252968,
            "negativeRecorded": 252728,
            "positiveScopes": 240,
            "skippedScopes": 435028,
            "enumNodesReal": 1662117,
            "enumNodesSkipped": 2941638,
            "realEntryChecks": 252968,
            "virtualEntryChecks": 435028,
            "realNodeChecks": 2258,
            "virtualNodeChecks": 5662,
            "nativeFallbackCalls": 0
          },
          "nakedQuad": {
            "calls": 19005,
            "scopesVisited": 682392,
            "realScopes": 251128,
            "negativeRecorded": 251051,
            "positiveScopes": 77,
            "skippedScopes": 431264,
            "enumNodesReal": 2408826,
            "enumNodesSkipped": 4215808,
            "realEntryChecks": 251128,
            "virtualEntryChecks": 431264,
            "realNodeChecks": 5664,
            "virtualNodeChecks": 11706,
            "nativeFallbackCalls": 0
          },
          "hiddenQuad": {
            "calls": 18928,
            "scopesVisited": 681225,
            "realScopes": 250746,
            "negativeRecorded": 250734,
            "positiveScopes": 12,
            "skippedScopes": 430479,
            "enumNodesReal": 2078254,
            "enumNodesSkipped": 3585039,
            "realEntryChecks": 250746,
            "virtualEntryChecks": 430479,
            "realNodeChecks": 4350,
            "virtualNodeChecks": 9042,
            "nativeFallbackCalls": 0
          }
        },
        "fallbackReasons": {},
        "violations": 0
      },
      "note": "summed over the pipeline runs that finished in the pool workers (consumed and speculative completed attempts); an attempt terminated before its end reports none"
    },
    {
      "key": "IG-S03/sc-m12/mega12:nightmare:3/scoped-attempts-w4",
      "stats": {
        "messages": 4,
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
      "note": "summed over the pipeline runs that finished in the pool workers (consumed and speculative completed attempts); an attempt terminated before its end reports none"
    }
  ],
  "audits": [],
  "catalogueProbe": {
    "wallMs": 111.77099999999996,
    "cpuMs": 124,
    "note": "unmeasured: loads the engine once per command so no arm carries the catalogue discovery"
  },
  "chain": {
    "attempts": [
      "a1"
    ],
    "resumed": false,
    "startedBefore": [],
    "startedHere": [
      "IG-S03/sc-m12/mega12:nightmare:1/scoped-attempts-w4",
      "IG-S03/sc-m12/mega12:nightmare:2/scoped-attempts-w4",
      "IG-S03/sc-m12/mega12:nightmare:3/scoped-attempts-w4"
    ],
    "rerunKeys": [],
    "noRerun": true,
    "unstartedAfter": []
  }
}
```
