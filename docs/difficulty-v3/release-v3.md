# Rating v3: release evidence closure (MS18e)

Data-only record of the final audit of the difficulty-v3 tree. It states what was run, what was not, and what is still
pending. **It is not a release-ready statement, and MS18e is still open** (see the acceptance state below): the remote CI gate,
two owner questions on held required rows and several unexecuted populations are open (sections 5 and 6). Every number comes from a file under
[`evidence/MS18e/`](evidence/MS18e/) or from an earlier task's evidence that it cites; nothing here is a measurement
of CI, of a browser or of another machine. Local runs: Windows, Node v26.13.0, 16 logical processors, harness time
factor 2, every Node command under the shared lock with the unchanged tee transcript.

## Acceptance state

E0, E1, E2 and E3 are completed stages. **MS18e stays OPEN** until the owner answers the held questions
(**MS18e-Q-GD-DEEP** for `RATIO-off`, `RATIO-summary`, `RATIO-full` and the seven `DEEP-mega16-hell1-*`;
**MS18e-Q-SAV11** for the S-AV11 profile) and their outcome is complete:

- **A:** one launch of each held row, plus the full 14-record Hell 1 reconcile.
- **B:** the rows are recorded as held, **not** as a waiver.

The only other route is an explicit, scoped acceptance waiver. Green CI closes only the remote-CI gate (section 6), not
MS18e. Blockers: the matching-head CI and these open decisions. Non-blocking observations (listed apart in
[`audit/gates-v2.json`](evidence/MS18e/audit/gates-v2.json)): the five GP misses (GP passed 74 of 79, 72 required), the accepted
S-AV14 finding, the mega12 Hell 1 finding and 563 manual assertions outside the dispatch (scope exclusions, not required work).

## 1. Status in one table

| Gate | Status | Basis |
|---|---|---|
| Coverage | **incomplete** | Both quick sets complete (below). GD complete (146 of 146 tests). The three S-OD8 ratio tests, the mega16 Hell 1 occurrences and the S-AV11 profile are held (required rows, owner decision pending); 563 manual assertions outside the dispatch are scope exclusions, unexecuted |
| Correctness | **pass** | No wrong puzzle, non-uniqueness, unsound deduction, wrong exactness flag or damaged evidence in any executed row; check-only GG, GR and GH pass |
| Exactness / availability | **fail (named findings, non-blocking observations)** | classic9 Normal 83 of 100 against 90 (S-AV14); mega12 Hell 1 exact 0 of 7; five GP misses |
| Timing | **incomplete** | All 75 E2 rows inside their P; no CI projection rises; held rows have no bound |
| Remote CI | **pending** | None of the eight task-defined PR jobs has a result on the final head. The early run failed two jobs (section 6) |

Per-gate detail: [`audit/gates-v2.json`](evidence/MS18e/audit/gates-v2.json). Complete item register (inherited 30 plus 38 added, 68 items):
[`audit/items-v2.json`](evidence/MS18e/audit/items-v2.json). The first versions (`gates.json`, `items.json`) are kept as raw records and are
superseded (see the revision note at the end).

## 2. Final source identities

| Identity | Value |
|---|---|
| Generator quick fingerprint | `46b3d0e22307b7900114cf619ef3fd376336a73c0c73878cc6d894b43c19205f` |
| Player quick fingerprint | `45dc04735d65dd353a547e851904c9bca41367cc6c37da04969a0f435044c8a7` |
| Generator with the manual trees | `d8d48983237d8aa09ecdb9038c5049a615682c76613f02e7a7e7e46d91c6c8b3` |
| Replay identity (wires and analyses) | `1cf64919a9004259a203e65bc7e537b15b981f4ed52610f4cd62d28cf6950fcc` |
| Hash identity (520 hashes) | `344afdeca4e2afe58ec552ddf4390608f6aee2febe9eb9c958b0c03b7bb8c1f1` |
| Producer sources | `75b0955e3e356bd1` |
| 79-cell target table | `3d0bffdb19cc8d0e4c2495163858bfcbf3fd6e3d8567f4718dc722a23746963a` |

The replay, hash, sources and target identities did not change at MS18e; no engine file (`core/js`, `generator/js`,
`player/js`) changed since the MS18d implementation. The quick and with-manual fingerprints moved with the documents,
guides and the two manual-suite guards of E1 (identity record: `audit/source-bindings.json`).

## 3. What was run

| Stage | Result |
|---|---|
| E0 | File-only inventory, scope map, reuse proofs, static scan of the 8 manual suites (116 call sites, 0 unguarded hidden-level requests) and an 88-row admission plan |
| E1 | Document and CI corrections; two B1 compatibility guards plus two more (classic9 Hell 1); early-CI fixes F1 (browser help count 26 to 40) and F2 (`replay-wire.js` checked out with CRLF); the Player CI limit checked against 900 s |
| E2 | 75 admitted rows, one locked invocation each: 22 GD, 32 I5, 21 deep (14 Nightmare, 7 mega12 Hell 1). Total tee 1,542.1 s, no overrun, no kill, no retry |
| E3 | Both complete quick sets, the CI arithmetic and check, the check-only GG/GR/GH, the variants reuse recheck, the final scan, workflow audit and item register |

**Quick sets** (factor 2, one command per shard, each complete and source-stable, every test once by suite and ordinal;
[`audit/coverage.json`](evidence/MS18e/audit/coverage.json)):

| Command | Tests | Passed | Failed | Skipped | Tee seconds |
|---|---:|---:|---:|---:|---:|
| Generator core-shared | 2,418 | 2,418 | 0 | 0 | 103.919 |
| Generator steps | 59 | 59 | 0 | 0 | 44.464 |
| Generator replay | 159 | 159 | 0 | 0 | 42.998 |
| Generator mega | 108 | 108 | 0 | 0 | 31.895 |
| Generator own-fast | 1,767 | 1,767 | 0 | 0 | 228.118 |
| Generator digger-target | 75 | 75 | 0 | 0 | 2.716 |
| Generator pipeline | 151 | 151 | 0 | 0 | 42.619 |
| Generator player | 70 | 70 | 0 | 0 | 58.829 |
| **Generator total** (55 suites) | **4,807** | **4,807** | 0 | 0 | 555.558 (sum) |
| **Player** (32 suites) | **2,981** | **2,981** | 0 | 0 | 118.281 |

**CI arithmetic** ([`ci/quick-cost.json`](evidence/MS18e/ci/quick-cost.json)): `newProjection = max(old, 10 x ceil(1.5 m / 10))`,
m the tee seconds. No projection rises (own-fast 350 equals the old, the Player job 180 stays below its old 190), so only
`measuredSeconds` changed. Groups 1,260 / 1,320 / 420 / 450 of 1,800 s; the Player job 750 of its actual 900 s.
These are local projections; **no remote duration is claimed**.

**GD (classic9)** ran completely: 21 of 22 rows exit 0; `GD-normal` exit 1, 7 of 8 passed: the hit-rate assertion
reports **83 of 100 against 90** (`difficulty.test.js:1272`, S-AV14), retained as failed. The Nightmare batch took
95.323 s (the old 430.5 s was another source) and the confusion matrix (700 requests) 181.763 s, both passing.

**I5** (the proof assertion of five other suites): 32 of 32 passed.

**Deep (mega-contract tool)**: Nightmare **14 of 14** complete and reconciled sound (6 relations pass; mega12 takes
1.7 to 2.5 s, mega16 5.5 to 22.8 s). **Hell 1 is incomplete**: the 7 mega12 occurrences ran and every one is a shallow
fallback (exact **0 of 7**, 92.9 to 104.7 s per run against 29.3 to 34.4 s at MS07b); the 7 mega16 occurrences were not
run. The optional partial reconcile ([`preflight/deep-reconcile-hell1-partial.json`](evidence/MS18e/preflight/deep-reconcile-hell1-partial.json))
is **expected, missing-only incomplete, not a correctness failure**. Raw values kept: exit 1, `complete` false, `evidenceSound` false,
`correctness` incomplete; its 7 problems are exactly the 7 approved missing mega16 IDs; the current source and tool hashes match,
7 records present and passed, relations 3 pass / 0 fail / 3 unevaluated. The earlier expectation of exit 3 was wrong:
`generator/tests/fixtures/mega-contract.js:1030` adds each missing occurrence to the problems, `:1054` sets
`evidenceSound = problems.length === 0` and `:1180-1182` returns 1 before the incomplete branch that returns 3. No tool edit, and
no blanket rule that exit 1 is allowed.

## 4. Limitations and what was not executed

- **Held without a credible <=450 s bound** (not run, not counted as passed): `RATIO-off`, `RATIO-summary`, `RATIO-full`
  (the three S-OD8 generation-cost ratio tests) and the seven `DEEP-mega16-hell1-*` occurrences, pending owner
  question **MS18e-Q-GD-DEEP** (unanswered); the S-AV11 profile (`SAV11`), pending **MS18e-Q-SAV11** (unanswered).
- **Manual suites outside the assignment** (extra-regions, greater-than, jigsaw, killer, perf, wordoku beyond their I5
  selectors: **563 assertions**) are scope exclusions, unexecuted, not required work of this task and not reported as passed.
  The variants suite is **reused-compatible** from MS18c (285 of 285 under another
  with-manual fingerprint), proved by four checks on the final tree
  ([`preflight/variants-compatibility-v3.json`](evidence/MS18e/preflight/variants-compatibility-v3.json)); it was not rerun.
- The guards added to hidden-level manual requests are **fixed guards**: three of the four ran inside GD at E2 and passed
  (classic9 Hell 1 floor in GD-rest-08, symmetry in GD-rest-11, killer master in GD-rest-14); only the perf serializer guard
  (`greaterThan/normal`) did not run.
- **Not an exhaustive claim:** finder caps and bounded proofs (S-AV31 to S-AV39) keep their sampled/constructed
  populations; nothing here is a universal coverage or causal speedup claim.
- GP passed **74 of 79** cells (72 required); the five misses (mega12/expert, sohei/hell2, butterfly/hell2,
  wordoku/expert, wordoku/nightmare) keep their exact numbers in [`performance-v3.md`](performance-v3.md). Retained
  as recorded: four epochs, 114 raw ledgers / 3,950 requests, nine unstarted control-holds, one zero-admission pre-window
  event, the 125-line C log, the three consumed one-use a3 grants (S-OD16, S-OD17, S-OD18), the F3 dispositions and the
  single final merge `732d1b66`; MS18e ran no GP and re-ran no archived operator or SA1 recompute script.

## 5. Decisions and open questions

| Item | State |
|---|---|
| S-OD7 | Killer Hard and Expert stay hidden until later calibration (raw verdicts kept apart) |
| S-OD13 to S-OD18 | Applied as recorded; no a3 or recovery used at MS18e |
| MS18e-Q-EARLY-CI | Answered A (owner message `1573181349634777210`): a draft PR for an early signal only; no merge |
| **MS18e-Q-GD-DEEP** | **Unanswered**: the held rows above stay unexecuted |
| **MS18e-Q-SAV11** | **Unanswered**: the S-AV11 profile stays unexecuted (driver run only without `--owner-decision`, exit 2) |
| MS18e-Q-CI-POLICY | No waiver proposed or granted |

## 6. Remote status

**Pending.** The early draft-PR run **44672736283** (head `b0a29ffd`, Node 24, Ubuntu) succeeded in 6 of 8 jobs and failed
*Test player in a browser* (F1: the script expected 26 techniques, the catalogue has 40) and *Test generator (own suites)*
(F2: the Linux LF checkout of `replay-wire.js`). Local fixes exist (`player/tests/browser/help.js`, `.gitattributes`); they are
not a remote result. The final gate needs **all eight** jobs of `pull-request.yml` to succeed on the matching final head
(run, job and attempt IDs recorded by the orchestrator), whatever the repository's protection says; the browser job has no
local coverage. SA1's read-only observation of 2026-11-20 (R6C-I01): `rulesets = []`, main unprotected; re-read at E4.
The workflows were audited statically ([`audit/workflow-audit.json`](evidence/MS18e/audit/workflow-audit.json)); Pages was
not dispatched. Record: [`audit/remote-ci.json`](evidence/MS18e/audit/remote-ci.json).

## 7. Evidence map

| What | Where |
|---|---|
| E0/E1 handoff, E2 summary, lock log with every command | `evidence/MS18e/handoff-v2.md`, `e2-summary.md`, `lock-log.jsonl`, `transcripts/` |
| Admission plan, scope and reuse maps, questions | `evidence/MS18e/preflight/` |
| GD, I5 and deep records | `evidence/MS18e/manual/`, `deep/` (the raw records), and the two reconcile outputs `evidence/MS18e/preflight/deep-reconcile-nightmare.json` and `preflight/deep-reconcile-hell1-partial.json` (the dispatch names `deep\reconcile-nightmare.json` and `deep\reconcile-hell1.json`; the files are not moved, the path differs) |
| Quick results, CI inventories and arithmetic | `evidence/MS18e/quick/`, `ci/` |
| Coverage, bindings, gates, items, workflow audit, remote record, identities | `evidence/MS18e/audit/` (`gates-v2.json` and `items-v2.json` are current; `gates.json` and `items.json` are the superseded first versions) |
| Final GP, hashes and report | `evidence/MS18d/` and [`performance-v3.md`](performance-v3.md) |
| Final qualification and published offers | `evidence/MS18c/` and [`../difficulty-rating/qualification.md`](../difficulty-rating/qualification.md) |
| Frozen limits | [`limits-v3.md`](limits-v3.md) |
| Notes of every task | [`notes.md`](notes.md) |

## Revision note

First version committed with E3 (`c5ee3df1`). Revised in place on 2026-11-20 after the binding SA2 findings (SA1 concurring), with
data only and no fingerprinted file changed: (1) the Hell 1 partial reconcile is classified from the tool source (section 3); (2) S-AV09,
S-AV10, S-AV12 and S-AV13 have their own rows in `audit/items-v2.json` with their MS05b3 history and the final MS18c qualification
status (the first register carried them in one range row, which is withdrawn; the 2026-11-15 checkpoint's older conclusion that all
three Nightmares were offered is not carried over); (3) the acceptance state above; (4) `audit/gates-v2.json` lists only the real blockers
and keeps the non-blocking observations apart, and states the S-OD8 ratio figures as illustrative all-attempt estimates (558.2 / 464.3 /
519.5 s), not bounds; (5) the killer master guard ran (GD-rest-14, test 145, passed in 5.0 s), so three of four guards ran; (6) the evidence
map names both reconcile files and their path difference. The raw records (`items.json`, `gates.json`, `handoff-v3.md`, `e2-summary.md`)
are kept unchanged.
