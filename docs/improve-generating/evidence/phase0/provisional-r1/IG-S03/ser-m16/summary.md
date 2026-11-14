# IG-S03 / ser-m16 (provisional-r1, a1)

**PROVISIONAL (pre-freeze). Not an offer, qualification or gate result; nothing here enables a cell, selects an allowance or changes a default.**

Evidence status: **provisional (pre-freeze)**. Formal gate: **not-evaluable-pre-freeze**.
Command status: **complete** (exit 0). Estimate verdict: provisional; judged in the task summary against IG-S02's matched baselines.

## Coverage

| planned | completed | censored | errors | unstarted | coverage complete |
|---|---|---|---|---|---|
| 1 | 1 | 0 | 0 | 0 | true |

Exclusions: the baselines are IG-S02's records (not rerun here); audited wall time is not a speed measurement; the unmeasured catalogue probe and the independent audit are outside every generation time; a censored or unverified arm proves neither identity nor speed

## Sources

| item | value |
|---|---|
| runtime label (supplied) | 1c042ad (label supplied by the pack; runtime f7be90f, unchanged by ef8a9cc) |
| runtime fingerprint | 36b2b8327f348fc6fc39471f34608c6679b9f3fc34e48178563cc4424173b50a |
| runtime files | 63 |
| harness fingerprint | dedddaef9979cddbc692430588e0962ae9c5a8926d1e599c05b537ca4d80e58c |
| adapters | scoped-solver |
| sources stable | true |
| firewall clean | true |

CPU: process.cpuUsage (user+system of the host process, worker threads included; read once at the host); observed quantum 16 ms. A value below the quantum is unresolved and gives no rate or factor.

## Paired rows (before = reference, after = prototype)

| pair | ref ready ms | ref cold ms | ref cpu ms | proto ready ms | proto cold ms | proto cpu ms | cpu factor | ready factor | cold factor |
|---|---|---|---|---|---|---|---|---|---|
| mega16:nightmare:3 | n/a | n/a | n/a | 104490.884 | 104583.686 | 105141 | n/a | n/a | n/a |

## Arm: prototype

| metric | n | p50 | p95 | max | upper median |
|---|---|---|---|---|---|
| ready wall ms | 1 | 104490.884 | 104490.884 | 104490.884 | 104490.884 |
| cold wall ms | 1 | 104583.686 | 104583.686 | 104583.686 | 104583.686 |
| cpu total ms | 1 | 105141 | 105141 | 105141 | 105141 |

Requests 1, complete 1, censored 0, errors 0, validation unknown 0, unstarted 0. Verified hits 0; per CPU second 0 (all spent CPU 105141 ms, resolved); per cold wall second 0 (all spent wall 104588.288 ms). With few requests p95 is the observed maximum.

Spent generation work behind the rates (completed, censored, error and validation-unknown requests all count):

| category | requests | cpu ms | wall ms (cold + cleanup) |
|---|---|---|---|
| complete | 1 | 105141 | 104588.288 |
| censored | 0 | 0 | 0 |
| errors | 0 | 0 | 0 |
| validationUnknown | 0 | 0 | 0 |
| total | 1 | 105141 | 104588.288 |

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
        "pairId": "IG-S03/ser-m16/mega16:nightmare:3/scoped-native-w1",
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
    "ok": 1,
    "notComparable": 0,
    "deferred": 0,
    "complete": true
  },
  "scoped": [
    {
      "key": "IG-S03/ser-m16/mega16:nightmare:3/scoped-native-w1",
      "stats": {
        "messages": 1,
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
      "note": "summed over the one pipeline run of the request"
    }
  ],
  "audits": [],
  "catalogueProbe": {
    "wallMs": 101.16190000000006,
    "cpuMs": 140,
    "note": "unmeasured: loads the engine once per command so no arm carries the catalogue discovery"
  },
  "chain": {
    "attempts": [
      "a1"
    ],
    "resumed": false,
    "startedBefore": [],
    "startedHere": [
      "IG-S03/ser-m16/mega16:nightmare:3/scoped-native-w1"
    ],
    "rerunKeys": [],
    "noRerun": true,
    "unstartedAfter": []
  }
}
```
