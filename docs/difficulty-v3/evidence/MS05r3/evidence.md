# MS05r3 evidence: the shallow-search allowance, its instrumentation and the work

Step evidence of the S-OD2 recovery (CV6-02 (a)); no acceptance and no commit. Authority: S-OD2, absorbed MS05c, R5.
Working tree: MS05b1 requiredness activation, MS05r1 tooling and MS05r2 consumers, plus this task; `HEAD` `f788e02`,
dirty. Node v26.13.0, Windows. Every sudoku node run that generates puzzles or may take more than 10 s went through
`Invoke-Dv3Node` (the verbatim helper, kept as `Invoke-Dv3Node.ps1` here, dot-sourced from `generator/` in the same
PowerShell invocation). Neither timing lock was held by anyone at any call: no wait longer than 0.1 s (total wall
minus the helper's own seconds). I never held two runs at once and left at least 15 s between consecutive runs of a loop.
The helper inherits node's output, so no log files exist: the results below are read from the console.

## Source identity

| Item | Value |
|---|---|
| Engine source hash (SHA-256 over the 63 `SOURCE_FILES`, the construction of `soak.js`) | `19afa6eea0af8042cafd10cca6e22587b7238233b89c8e6f2ac46192086f4a2e`, the value in the mega12 parity record and in every smoke ledger (MS05r1: `70036fafe7e2e9ad3d5d5a80e8930d2e251fbfa79a5a17610d5b99a1dc9591f7`) |
| `js/engine/digger.js` (LF-normalised SHA-256, first 16) | `26e8c9d9be83c987`, 2,018 lines (MS05r1: `4b03280b1f3b0934`, 1,849 lines) |
| `js/engine/pipeline.js` | `df4daeec92b5ee2a`, 371 lines (MS05r1: `8206a21eca6b211a`) |
| `js/variants/killer.js`, `js/engine/explain-data.js` | `bd0db55a5e853b6e`, `3007aa6651f77f70`: unchanged by this task |
| `tests/soak.js` | `9c4a723866b88d18`; ledger `meta.toolHash` `da295e75f43dcd8cd5b66e0f566892b14036ea2ce9297b29a848abcb9c98bc72` (the current files give the same value) |
| `tests/fixtures/difficulty-diagnostics.js`, `tests/fixtures/perf-helper.js` | `9e25dbc59b137776`, `888fc92dedb178b0` |
| Recovery driver `toolHash` (the four files of `tests/difficulty-recovery.js`) | `60087ccda4afe35ec0df7d98d51a61a3ef68c94d99cb931e27eeed4d0e1df5ed` (before this task: `eb2194c9a1fe0820f2ba82c5af322a6326634049fb44f75b2852c3fe72ab08b0`); `difficulty-recovery.js` itself is unchanged (`e2d99997546667b1`), `recovery-profile.js` is `fc32f1f7e25ec80e` |
| Test suites | `difficulty-diagnostics.test.js` `d86210ae4cf26f15`, `pipeline.test.js` `b9c85c07c905bc13`, `worker.test.js` `fc0a53b8be416b79`, `cache.test.js` `6a62e0c79be5d491`, `recovery-profile.test.js` `ee0dea33e0f2c8f0` |

## Commands

The four required commands first (all from `generator/`, all `Invoke-Dv3Node -Task MS05r3 -NodeArgs @('tests\node-runner.js', ...)`).

| Selector | Exit | Result | Wall | Lock wait |
|---|---:|---|---:|---:|
| `--suite=digger,difficulty-diagnostics,difficulty-floor,worker,cache,recovery-profile` | 0 | 463 of 463: `digger` 64, `difficulty-diagnostics` 80, `difficulty-floor` 48, `worker` 143, `cache` 101, `recovery-profile` 27 | 91.9 s | 0 |
| The same selector, run again at the end after the last test edits | 0 | 463 of 463, same split | 92.3 s | 0 |
| `--suite=pipeline --filter=recovery: shallow allowance --verbose` | 0 | 16 passed (15 scripted, 1 real Master seed 1) | 1.7 s | 0 |
| `--suite=pipeline --filter=> pipeline: the PuzzleResult (design.md 13.9) > has exactly the fields of the contract --verbose` | 0 | 1 passed | 0.7 s | 0 |
| `--suite=pipeline --filter=MS05b1- --verbose` | 0 | 30 passed (the MS05b1 tests, MS05b1-T02 under its own scope) | 1.6 s | 0 |

Other runs.

| Command | Exit | Result | Wall | Lock wait |
|---|---:|---|---:|---:|
| `--suite=difficulty-diagnostics` (development) | 1, then 0 | the first run failed four of my new tests; fixed in the tests, then 76 of 76 (80 after the later additions, see above) | 10.3 s, 11.2 s | 0 |
| `--suite=digger`, `--suite=recovery-profile` (alone, development) | 0 | 64; 27 | 1.0 s; 0.8 s | 0 |
| `--suite=help` (the guide edits) | 0 | 30 passed | 4.0 s | 0 |
| `tests\soak.js --variant=classic4 --level=veryEasy --count=1 --seed=20260101 --no-gate --json=<scratch>` (identity check, the scratch file deleted) | 0 | `sourceHash` and `toolHash` equal the smoke ledgers; PASS | 0.6 s | 0 |
| The parity and smoke runs (below) | 0 each | see below | see below | 0 |
| The premise audit (below) | mixed | see below | see below | 0 |

No full quick set, GS/GG/GR/GH, manual corpus, qualification, perf, `--all`/`--manual`, G13 or `mega16` profile, recovery
CLI in diagnostic mode, or `SG_UPDATE_HASHES`. The outstanding gates stay as they were.

## What changed

| File | What |
|---|---|
| `js/engine/digger.js` | `SG.digger.SHALLOW_SEARCH_RATINGS` (default literal `SHALLOW_SEARCH_DEFAULT = Infinity`, line 653; export near line 2002), the local-search collector `caps.localSearches`, the counted rating (`rateCounted`, the allowance and the cap reasons), the work copy and its attachment to errors |
| `js/engine/pipeline.js` | `result.work` (the copy), and `work` on the wire (`toWire` and `fromWire`) |
| `tests/soak.js` | `--shallow-cap`, `--from`, `--count` and `--total-count` shards, the work and its conservation per row, the exact-flag agreement, `meta.shallowCap`, `meta.shallowSearchRatings`, `meta.toolHash`, `meta.acceptance`, the manifest's shard, `from`, `logicalTotal` and `referenceIndexes` |
| `tests/fixtures/difficulty-diagnostics.js` | the derived verdicts and the work check, `not-selected` references, the summary lines, `mergeShards` |
| `tests/fixtures/recovery-profile.js` | `copyCaps` deep-copies `caps.localSearches`; the usage text |
| `tests/suites/pipeline.test.js`, `worker.test.js`, `cache.test.js`, `recovery-profile.test.js`, `difficulty-diagnostics.test.js` | the tests listed in the task's plan (below) |
| `design.md`, `DEVELOPERGUIDE.md`, `DEVELOPERGUIDE.vn.md` | 6.8, 13.9, 15.3, 15.4 and the suite table; the soak paragraph and the recovery-profile bullet |
| this directory | `Invoke-Dv3Node.ps1` (51 lines), `premise-audit-preload.cjs` (34), `quick-contracts.json` (113), `parity/mega12-nightmare.json` (89), `smoke/*.json` (5 ledgers) |
| `docs/difficulty-v3/notes.md` | the MS05r3 section |

The tree also holds the uncommitted MS05b1, MS05r1 and MS05r2 work, so a `git diff HEAD` mixes the tasks (against `HEAD`:
`digger.js` +306 -68, `pipeline.js` +23 -6, `soak.js` +224 -45, the diagnostics fixture +329 -54, `pipeline.test.js`
+1186 -4, `difficulty-diagnostics.test.js` +874 -60, `worker.test.js` +93 -3, `cache.test.js` +47 -0). The line counts of
the files that exist only because of MS05r1 and MS05r3 cannot be separated that way.

## The allowance, as the tests pin it

`SG.digger.SHALLOW_SEARCH_RATINGS` is read at the start of each local search (`Infinity` or an integer of at least 0;
anything else is `digger.invalidOption`). A search's record is
`{ ratings, proposals, firstShallowAt, shallowRatings, shallowLimit, capHit }`.

| Case (16 pipeline tests, `recovery: shallow allowance`) | Pinned |
|---|---|
| 3 earlier ratings, the first shallow state at ordinal 2, allowance 64 | `firstShallowAt` 2; 64 further ratings; the next call is refused with `capHit: 'shallow'` and the rater is not invoked |
| allowance 0, a state shallow at entry | `firstShallowAt` 0; the first rating is refused |
| a refinement that first shows a shallow state at ordinal 3; one still above the band | counted from there; no proposals, no cap hit for the one above |
| memo visits | proposals, not ratings, no allowance cost (an allowance of exactly M distinct candidates passes, M - 1 stops) |
| leaving and re-entering the band | the count starts once and does not restart |
| two attempts; two interleaved cooperative runs | per-attempt records, no shared state |
| a throwing rating | the same error object, a non-enumerable `work`, the rating stays counted |
| parent cancellation | `budget.cancelled` with the partial work |
| an exact keeper; exact on the last permitted rating | ends the attempt, no cap hit |
| the old caps | keep their own reason (`'ratings'`, `'proposals'`), the ratings cap first |
| an invalid setting | `digger.invalidOption` |
| `Infinity` against `1e9`, scripted and real Master seed 1 | identical results and work; on the real seed, allowance 64 ends exactly 64 ratings after `firstShallowAt` (68) |

## Parity at the default

`mega12` Nightmare (seed 3, one attempt, `tests\difficulty-recovery.js --mode=profile`), run on the frozen source,
written to `parity/mega12-nightmare.json` (wall 7.49 s, lock wait 0). Against MS05r1's record:

| Field | MS05r1 | Here |
|---|---|---|
| `puzzleHash` | `8cc70327e732a27837121105f77b384c6a78ca1a3eebd8ffac1ff57d0b890c70` | equal |
| score | 2046 | 2046 |
| work (ratings, proposals) | 635, 32,768 | 635, 32,768 |
| samples, local ratings | 20, 615 | 20, 615 |
| the local search | not recorded | `{ ratings: 615, proposals: 32768, firstShallowAt: 0, shallowRatings: 615, shallowLimit: null, capHit: 'proposals' }` |

The pipeline test `Infinity` against `1e9` gives the same on scripted and real inputs.

## Shard smoke

`classic4`/`veryEasy`, seed 20260101, `--no-gate`, `--json`: the whole count-12 cell, shards `--from=0 --count=6` and
`--from=6 --count=6` (`--total-count=12`), and the same two shards with `--shallow-cap=64`. All five exit 0, lock wait 0
(wall not recorded one by one; each is a very easy cell that takes well under 10 s). References are at absolute
indexes 0 and 11; each shard carries only its own.

| Check | Result |
|---|---|
| `mergeShards([whole])` | ok, 12 rows |
| `mergeShards` of the two default shards | ok, 12 rows by index; each row equals the whole cell's row (timings aside) |
| `mergeShards` of the two cap-64 shards, given in reverse order | ok, 12 rows; each row equals the default row (timings aside) |
| `mergeShards` of one default and one cap-64 shard | rejected: differs in `shallowCap` and in `shallowSearchRatings`; no rows |
| one shard alone; a shard twice | rejected: "6 of 12 indexes are missing"; "index 0 is in ledger 0 and in ledger 1" and so on |
| default shard against cap-64 shard | rows differ only in `generationMs` and `diagnosticMs`; the work is identical (very easy starts no local search); the summary is equal; the meta differs in the setting fields, `startedAt` and `argv` |

## The premise audit

`premise-audit-preload.cjs` (audit only) starts the setting at `DV3_AUDIT_CAP` before the sources run, and with
`DV3_AUDIT_FORCE=1` ignores later assignments, so a test that scopes `Infinity` cannot undo it.

| Run | Result |
|---|---|
| `pipeline`, the MS05b1 sign-memo test only, forced to 0, 4, 8, 16, 32, 64 | fails at 0, passes at 4 and above |
| default 64 (not forced): `digger` 64, `difficulty-diagnostics` 80, `difficulty-floor` 48, `cache` 101, `recovery-profile` 27 | all pass |
| default 64: `pipeline --filter=MS05` | 49 of 49 |
| default 64: `worker` | 3 of 143 fail (`worker mode and main thread mode give identical results and traces`: classic9/normal seed 5, jigsaw9/easy seed 2, wordoku/easy seed 6), then the process stayed open until the 540 s limit |

The worker failures are an artifact of the audit: the preload reaches the main realm only, and `gen.worker.js` loads its
own source at the default, so only `shallowLimit` (64 against null) differs in `work`. A production default is the same in
both realms. The sign-memo test stays scoped to `Infinity` (`withAllowance` and `noExtraAllowance`, try/finally); at 64
and above it would not have failed, so the scope is the task's requirement and not a measured need (see Spec gaps).
`quick-contracts.json` has the eight entries (seven `schema`, one `no-extra-allowance-premise`) with the assertion before
and after and the focused result of each, and the `reviewedUnchanged` list.

## Spec gaps, discrepancies and incidents

1. "duplicates/gaps/incompatible settings rejected" is read as a merge helper: `mergeShards` (with `shardIdentityOf`) in
   the diagnostics fixture and `meta.toolHash`, which the "same source/tool" check needs. Neither is named in the task.
2. The sign-memo premise is not violated at 64, 128 or 256 for its seed (it fails only at 0); the scope is kept as
   the task requires.
3. The audit's worker failures are an artifact of a preload in one realm, and the process then hung until the 540 s
   limit. It is not an acceptance command and is recorded as a timeout.
4. No log files: the helper inherits the console, so an attempt to save them wrote empty files, which were deleted.
5. `copyCaps` in the recovery driver covers failure snapshots; the success path passes the returned `work` through.
   Reconciliation compares only the four base fields, as the r1 handoff said.
6. The recovery CLI's diagnostic mode is enabled by this task and was not run (it is heavy and r4's).
7. A default-pinning assertion of my own new test was removed so r4 can change the literal without touching a test; the
   soak ledger tests read the setting in force.
8. The `help` suite was also run (not a named command) to check the guide edits; it passed.

## Handoff to MS05r4

- **The setting.** `SG.digger.SHALLOW_SEARCH_RATINGS`, `Infinity` here. R5's value is applied by changing the literal
  `const SHALLOW_SEARCH_DEFAULT = Infinity;` in `digger.js` (line 653); nothing else. It is read when each local search
  starts, so a value set in a vm before the call takes effect for that call.
- **Soak.** `--shallow-cap=64|128|256|none` (`none` is `Infinity`) sets it after the sources load and before generation;
  an absent flag keeps the default. The ledger records which: `meta.shallowCap` (the string, null when absent) and
  `meta.shallowSearchRatings` (null is `Infinity`); per row `work[].localSearches[].shallowLimit` and `capHit`.
- **Recovery CLI.** `--mode=diagnostic --case=... --shallow-cap=...` sets the value for the run and restores the old
  one; 8 attempts; `none` is `Infinity`.
- **R5's four settings** (`none`, 64, 128, 256): each is one soak run per cell with the flag (the whole cell for
  classic9/normal, shards where the task plans them, as for killer/expert), with `--no-gate` and `--json`. The shards use
  `--from=k --count=n --total-count=N` for exactly one variant and level; tags stay `variant:level:absoluteIndex`.
  `mergeShards(ledgers)` of `SG.fixtures.difficultyDiagnostics` checks that the shards of one plan are complete, without
  duplicates or gaps, with the same source, tool, node, seed base, acceptance and setting; it returns
  `{ ok, problems, cell, rows }`, the rows by index when `ok` (else `null`). Statistics are computed from those rows,
  never from the shard summaries.
- **What r4 reads.** `row.generationExact` (the hit), `row.fullRatings` (the upper median at index `floor(12 / 2)`),
  `row.workCheck.status` (`'ok'`; `unavailable` blocks the selection and a mismatch fails the run), `row.outcome`,
  `ledger.complete`, `summary.checks.result`, and `meta.sourceHash`, `meta.toolHash`, `meta.node`, `meta.seedBase`,
  `meta.acceptance`.
- **Premises.** After the literal changes r4 repeats the `MS05b1-` pipeline selection with its default. A test that
  needs the old caps alone and fails there comes back to r3 for a test-only fix. The G13 and `mega` profiles of r1 are
  the evidence a diagnostic run is compared with; they were not repeated here.
