# MS05r5m evidence: the mega Nightmare quick/deep validation contract

Step evidence of the S-OD2 recovery (S-OD3 (a), S-OD4, CV6-03), not an acceptance; no commit of its own. Tree:
`rating-v3` at `1ae831c` plus the uncommitted retained recovery tree, the step evidence of MS05r5p and MS05r5 and this
task's changes (`dirty` in the records). Node v26.13.0, Windows, AMD EPYC 7763 (16 cores, 64 GiB), time factor 2.
Every deep record carries the same identity (`reconciled.json`, `identity`):

| Identity | Value |
|---|---|
| Engine sources (`sourceHash`) | `fee8b8d6d7a2c47f6f2c8628a0e940da72a8c3789448a7700ad787bc044025d0`, the source of MS05r5p's three closure diagnostics (MS05r5 and MS05r5m changed no engine file) |
| Tool (`toolHash`) | `2bff3a04d716af19d870b82cc1760b95fe011ec1b5117735a5678e25ac48fdd8`: `tests/mega-contract.js` and `tests/fixtures/mega-contract.js` (the shared loader of `tests/replay-fixtures.js` and the level guard of `tests/fixtures/tool-records.js` are used unchanged and are not hashed) |
| Manifest (`manifestHash`) | `758f5b0a1706ff9cbc565883dceee8d3a9e123670f1b6427a96e9d7a68c155f1`: the 14 requests, their default attempts and the relations |
| Checks version | 1 (the set and the meaning of the 15 checks) |
| Allowance, budget | 256 (`SG.digger.SHALLOW_SEARCH_RATINGS`); 500,000 ms for a request and its checks; process limit 540,000 ms |
| Run window | the 14 records were taken from 2026-11-13 17:41 to about 18:34 UTC, one locked process each; Pentomino's MP12b1 held the other lock for most of the time |

Every command below went through `Invoke-Dv3Node` (`Invoke-Dv3Node.ps1`, the check-list helper, 20-minute wait) by way
of `Run-Dv3Logged.ps1`, which appends one record to `runs.jsonl` (the lock wait is the wall time minus the node
seconds); the transcripts are in `logs/`. Each deep request had its own process and lock and a 15-second gap before it.
The longest lock wait was 260 s; no command came near 540 s and none was stopped.

## The contract

**Quick** (`generator/tests/suites/mega.test.js`): the four full-attempt Nightmare callbacks are gone; every other
test, Hell 1 included, is unchanged. Four tests replace them:

| New quick test (full name after `mega > mega puzzles > `) | Ordinal | What it proves |
|---|---:|---|
| `mega12 nightmare: one attempt (seed 3) is a valid, unique and truthful puzzle inside the smoke limit` | 96 | A real `generate('mega12', 'nightmare', 3, { maxAttempts: 1 })` (not one of the 14 deep occurrences): attempts 1, every invariant of the old test (`checkInvariants`: unique, valid solution, Latin geometry, givens inside the solution, clue floor, band and group or the approximate warning, every logical placement and elimination against the solution) and the requiredness and warning contract from an independent rating (exact iff in the level and the tier is needed; approximate iff not exact; shallow iff not exact and in the band; no other warning), under a smoke limit of 15,000 ms times the factor |
| `mega16 size-default controls (scripted, Expert tier): stop, fallback, cancellation > the size default stops after two attempts with a truthful two-warning shallow fallback` | 97 | Real pipeline and digger with a scripted dig strategy (MS05r5p's seams, a mega16 variant, allowance 0, no real rating), at the Expert tier: no `maxAttempts` gives two attempts (`fullGrid.start` twice, `maxAttempts: 2`), `exact` false, exactly the two warnings, a rating in the band that does not need its tier, the `done` event agrees |
| `… > an explicit number of attempts wins over the size default` | 98 | `maxAttempts` 1 and 3 give exactly 1 and 3 attempts, both warnings |
| `… > a cancelled or exhausted budget propagates its error and never returns the best puzzle so far` | 99 | In the first sample of attempt 2, with a shallow candidate in hand, `budget.cancelled` (reason `cancelled`) and `budget.exceeded` (reason `time`, a scripted clock) are thrown out of `SG.pipeline.run`; no puzzle is returned |

The three scripted controls were first named `mega16 nightmare: the scripted control of the stop, the fallback and the
cancellation > …`; after the analyst review (IR01) they carry the honest group name `mega16 size-default controls
(scripted, Expert tier): stop, fallback, cancellation` (test names and ordinals `mega#97` to `#99` unchanged). They run
at the Expert tier, as MS05r5p's seams do, because the Nightmare tier (`spec.proposal`) rates and refines its proposal
samples for real, which a scripted strategy cannot stand in for; no Nightmare-tier generation test was added. The policy
they prove (the size-default attempt loop, the fallback and its warnings, the override, the cancellation) does not
depend on the level. The Nightmare-tier proposal samples are covered by real evidence instead: the one-attempt mega12
smoke (`mega#96`) and the seven mega16 Nightmare deep records. Three mutations of the engine (the default attempts
forced to 8, the shallow warning dropped, a budget error swallowed) each failed the controls; the quick-tier mutation
checks are not kept as files.

**Deep** (`generator/tests/mega-contract.js`, helpers `SG.fixtures.megaContract` in
`generator/tests/fixtures/mega-contract.js`, quick suite `mega-contract`, 37 tests): `--list`, one `--request` once with
its checks, and a strict no-generation `--reconcile`. A tool, not a discovered suite, not CI and not the `SG_DEEP`
branch (which was not run). The command line, the checks, the record, the reconciliation, the exit codes and the reuse
interface are described in `generator/design.md` 15.4 and the developer guides.

### The fourteen occurrences and the old tests

| Old quick test (inventory `mega#`) | Deep occurrences (id: seed) | Assertions kept | Relations kept |
|---|---|---|---|
| `mega12 nightmare: 4 puzzles are unique, valid and inside the 9.1 time budget` (76) | `mega12-invariant-1` to `-4`: seeds 1, 2, 3, 4 | all of `checkInvariants` on each (plus the requiredness and warning contract); the 3,000 ms times the factor time assertion becomes a recorded time, no pass or fail | none |
| `mega12 nightmare: the same seed gives the same puzzle (CV5)` (77) | `mega12-cv5-a`: 3 (first call), `mega12-cv5-b`: 3 (second call), `mega12-cv5-other`: 4 | the full checks on each (the old test checked only the relations) | `mega12-cv5-same-seed` (a, b: givens, solution, score equal), `mega12-cv5-other-seed` (other against a: solutions differ) |
| `mega16 nightmare: 4 puzzles are unique, valid and inside the 9.1 time budget` (92) | `mega16-invariant-1` to `-4`: seeds 1, 2, 3, 4 | as for mega12; the 10,000 ms times the factor assertion becomes a recorded time | none |
| `mega16 nightmare: the same seed gives the same puzzle (CV5)` (93) | `mega16-cv5-a`: 3, `mega16-cv5-b`: 3, `mega16-cv5-other`: 4 | as above | `mega16-cv5-same-seed`, `mega16-cv5-other-seed` |

Each of the 14 is Nightmare, trace off, the default symbol set, symmetry and dig order, no `maxAttempts` (4 on mega12,
2 on mega16), one process and one record; the seed-3 CV5 calls are independent generations, not reads of one record.
Two extra relations that the old test did not have compare `<board>-invariant-3` with `<board>-cv5-a`
(`mega12-invariant-3-same-seed`, `mega16-invariant-3-same-seed`, `original: false`). The old 6 s and 20 s failures
(MS05r4: seed 1 of mega12 took 48.2 s at 8 attempts; both mega16 tests ended in `budget.exceeded` at 60 s) are recorded
history; they are replaced quick contracts, not changed design or qualification targets.

### The quick inventory (`inventory-diff.json`, `inventory-diff.js`)

| | Tests | Suites | `sourceHash` |
|---|---:|---:|---|
| Before (`evidence/MS05r5/generator-inventory.json`) | 3,170 | 48 | `dfc34b67…` |
| After (`generator-inventory.json`, complete, no registration error, no skip) | 3,207 | 49 | `b0d11a5d…` |

By full name, the removed tests are exactly the four Nightmare tests above (`mega#76`, `#77`, `#92`, `#93`), the added
tests are the four mega quick tests (`mega#96` to `#99`) and the 37 of the new suite `mega-contract`, and the other
3,146 tests of the before inventory are in the after inventory with the same name, kind, skip flag and limit. Twenty of
them moved to a lower ordinal inside the `mega` suite only: the Hell 1 rows are now `mega#76`/`#77` (mega12) and
`#90`/`#91` (mega16) (before `#78`/`#79` and `#94`/`#95`), so the ordinals 76 and 77 now name Hell 1 tests; use the
full names. The `mega` suite still has 111 tests.

## Commands (exit code, node seconds, wall seconds, lock wait)

Locked, from `generator/` (every row is a record of `runs.jsonl`):

| Label | Command | Exit | Node s | Wall s | Lock wait s |
|---|---|---:|---:|---:|---:|
| d01 to d14 | `tests\mega-contract.js --request=<id> --record=..\docs\difficulty-v3\evidence\MS05r5m\records\<id>.json`, once for each id, in the order of the table below | 0 (each) | 24.0 to 25.7 (mega12), 80.9 to 118.1 (mega16) | 45.9 to 368.3 | 15.1 to 260.3 |
| r01 | `tests\mega-contract.js --reconcile=..\docs\difficulty-v3\evidence\MS05r5m\records --json=..\docs\difficulty-v3\evidence\MS05r5m\reconciled.json` | 0 | 0.499 | 25.667 | 25.168 |
| s01, s02, s03 | `tests\node-runner.js --suite=mega --exact="mega > mega puzzles > mega12 nightmare: one attempt (seed 3) is a valid, unique and truthful puzzle inside the smoke limit" --results=…\quick\mega12-smoke-<n>.json --verbose` | 0 | 5.566, 5.545, 5.575 | 40.754, 65.781, 125.880 | 35.188, 60.236, 120.305 |
| f01 | `tests\node-runner.js --suite=mega --filter="mega16 size-default" --results=…\quick\mega16-size-default-controls.json --verbose` (after the IR01 rename; selected total 3, passed) | 0 | 0.412 | 10.585 | 10.173 |
| f02 | `tests\node-runner.js --suite=mega-contract,ui-contract,help --results=…\quick\mega-contract-ui-contract-help.json` (134 of 134) | 0 | 6.157 | 151.388 | 145.231 |

The per-id rows d01 to d14 are in `runs.jsonl` and `logs/d<nn>-<id>.txt`. Not locked, each well under 10 s of node time
(check-list 7): `--list` (0.103 s, `logs/a01-list.txt`), both inventories and the eight shard preflights of the refreshed
manifest (registration 0.2 to 0.5 s each), `manifest.js --build` and `--check`, and development runs of the new suite
(37 of 37 in 1.5 to 1.9 s), the scripted controls and the mutation checks, a CLI trial of `--request` and `--reconcile`
on a small real board (classic6, a scratch folder that is deleted), and the refusal matrix of the CLI (an existing file,
an absolute path, a path outside the repository, a wrong file name, a fingerprinted folder, a wrong extension, a
`--json` inside the records folder, a missing folder, an unknown, repeated, conflicting or incomplete option: each exit
code 2 with its message). No heavy suite, GG, GR, GH, soak, qualification, `SG_DEEP`, `--all` or `--manual` ran, and no
whole quick set.

The CLI trial found one defect (the reconcile mode read `args.reconcile` instead of `args.directory`), fixed before the
first deep record; no deep record was taken with an earlier tool. Two rounds of listings were superseded and replaced.
After the first listing two tests were added to the suite (the score of a relation compared on its own, and a puzzle
whose checks ran out of budget in a reconciliation): the first runs q01, the first controls c01 to c03, the first
inventories, preflights and manifest (labels i01, i02, m01 to m04, at `sourceHash` `bc249f95…`, 35 tests) were replaced
by q02, c04 to c06, i03, i04, the second preflights and m05 and m06 (at `7d25f0d0…`, 37 tests). After the analyst review
(IR01, the rename of the three controls; IR03, wording only) q02, c04 to c06, i03, the generator preflights and m05 and
m06 were replaced again by f01, f02, i05, the third generator preflights and m07 and m08 (all at `b0d11a5d…`, 37 tests;
the Player inventory and preflight, at `2f755655…`, are unchanged because no Player-fingerprinted file changed).
`runs.jsonl` keeps all the records, the folder only the last set. The three smoke runs (`sourceHash` `0188de5d…`) precede
the final comment of `SMOKE_MS` in `mega.test.js`, the guide edits, the two added tests and the rename; the smoke test
itself and `mega.test.js` otherwise differ from what they ran only in that comment and in the controls' names and
comment.

## The deep records (`records/`, `reconciled.json`)

All 14 were generated once, in this order, each `outcome: ok`, `correctness: pass` (every one of the 15 checks `true`:
valid solution, Latin geometry, givens inside the solution, clue floor, band and group, attempts, wire round trip,
uniqueness, rating agrees, exact flag, approximate and shallow warnings, no other warning, soundness of every logical
step against the solution). Seconds are generation, then checks; the margin is against the 500 s budget.

| Occurrence | Seed | Attempts | Exact | Warnings | Score | Clues | Generation s | Check s | Margin s | Puzzle digest |
|---|---:|---:|---|---|---:|---:|---:|---:|---:|---|
| mega12-invariant-1 | 1 | 4 of 4 | false | approximate + shallow | 1,991 | 54 | 23.721 | 0.012 | 476.3 | `66ddc35a3f2c…` |
| mega12-invariant-2 | 2 | 4 of 4 | false | approximate + shallow | 2,090 | 56 | 23.520 | 0.017 | 476.5 | `d7f8f58e82f9…` |
| mega12-invariant-3 | 3 | 4 of 4 | false | approximate + shallow | 2,046 | 56 | 23.637 | 0.014 | 476.3 | `8cc70327e732…` |
| mega12-invariant-4 | 4 | 4 of 4 | false | approximate + shallow | 2,141 | 58 | 25.243 | 0.016 | 474.7 | `12d71eaadcaa…` |
| mega12-cv5-a | 3 | 4 of 4 | false | approximate + shallow | 2,046 | 56 | 23.723 | 0.016 | 476.3 | `8cc70327e732…` |
| mega12-cv5-b | 3 | 4 of 4 | false | approximate + shallow | 2,046 | 56 | 23.867 | 0.016 | 476.1 | `8cc70327e732…` |
| mega12-cv5-other | 4 | 4 of 4 | false | approximate + shallow | 2,141 | 58 | 24.951 | 0.015 | 475.0 | `12d71eaadcaa…` |
| mega16-invariant-1 | 1 | 2 of 2 | false | approximate + shallow | 2,149 | 110 | 116.951 | 0.031 | 383.0 | `582e3f469ed7…` |
| mega16-invariant-2 | 2 | 2 of 2 | false | approximate + shallow | 2,124 | 116 | 103.606 | 0.030 | 396.4 | `e90620f18164…` |
| mega16-invariant-3 | 3 | 2 of 2 | false | approximate + shallow | 1,925 | 114 | 107.517 | 0.014 | 392.5 | `b9b7c78ca5e3…` |
| mega16-invariant-4 | 4 | 2 of 2 | false | approximate + shallow | 2,164 | 112 | 80.394 | 0.030 | 419.6 | `2d334c10efcd…` |
| mega16-cv5-a | 3 | 2 of 2 | false | approximate + shallow | 1,925 | 114 | 107.753 | 0.013 | 392.2 | `b9b7c78ca5e3…` |
| mega16-cv5-b | 3 | 2 of 2 | false | approximate + shallow | 1,925 | 114 | 104.106 | 0.015 | 395.9 | `b9b7c78ca5e3…` |
| mega16-cv5-other | 4 | 2 of 2 | false | approximate + shallow | 2,164 | 112 | 80.487 | 0.028 | 419.5 | `2d334c10efcd…` |

The digest is SHA-256 of `variantId|givens|solution`, the recipe of MS05r5p's diagnostics: the seed-3 puzzles are those
of r5p's `mega12-nightmare.json` (`8cc70327e732…`) and `mega16-nightmare.json` (`b9b7c78ca5e3…`), reproduced three times
per board in independent processes (and r4's exact mega16 seed-3 puzzle `c8d26f3c0366…` at 8 attempts is not reached
at 2: given up by design). Each record is 15 to 21 KB with its plain wire (`SG.replay.toPlainWire`).

### Relations (all six evaluated, all pass)

| Relation | Original | Verdict | Evidence |
|---|---|---|---|
| `mega12-cv5-same-seed` | yes | pass | givens, solution and score equal |
| `mega12-cv5-other-seed` | yes | pass | the seed-4 solution differs from the seed-3 one |
| `mega12-invariant-3-same-seed` | no (extra) | pass | givens, solution and score equal |
| `mega16-cv5-same-seed` | yes | pass | givens, solution and score equal |
| `mega16-cv5-other-seed` | yes | pass | the seed-4 solution differs from the seed-3 one |
| `mega16-invariant-3-same-seed` | no (extra) | pass | givens, solution and score equal |

### Verdicts, kept apart

| Verdict | Result |
|---|---|
| Inventory | complete (14 of 14, each once), `evidenceSound` true, no problem; the identities are single (no mixed source, tool, Node, allowance or budget) and equal to the current sources and tool |
| Generation | 14 of 14 produced a puzzle; no `generation-error`, no `check-error`, no budget or cancellation error |
| Correctness | `pass` (14 of 14 records, 6 of 6 relations); exit code 0 of `--reconcile` |
| Exactness | 0 of 14 exact: every request ended in the truthful shallow fallback (`difficulty.approximate` and `difficulty.shallow`); the seeds 1 to 4 give four distinct puzzles per board, 0 of 4 exact each |
| Timing | mega12 23.520 to 25.243 s (median 23.723 s), none over 30 s or 120 s; mega16 80.394 to 116.951 s (median 104.106 s), 7 of 7 over 30 s, none over 120 s (all measured in Node, synchronously, with trace off, which is not the application's worker run with trace on: see S-AV03) |

### Guards and margins (reported per board from the completed fixed population of seven)

Rule (in the tool): 1.5 times the largest generation plus check time, rounded up to 5,000 ms, at most the 500,000 ms
budget; reported only when all seven requests of the board completed, never extrapolated.

| Board | Largest total | Reported guard | Margin | Share | Against the 500 s budget | Application guard (120 s) |
|---|---:|---:|---:|---:|---|---|
| mega12 | 25.259 s (`mega12-invariant-4`) | 40 s | 14.741 s | 36.9 % | 474.7 s left at worst | 4.8 times of margin |
| mega16 | 116.982 s (`mega16-invariant-1`) | 180 s | 63.018 s | 35.0 % | 383.0 s left at worst | 3.0 s left (97.5 % of it used) at worst, measured in Node with trace off (see S-AV03) |

These are measured on seven fixed requests per board on this machine, not a product promise; the 500 s budget and the
540 s process limit are unchanged, and no guard exceeds them.

## The CV3 reuse interface for MS05b3 (T05)

`SG.fixtures.megaContract.reuse(records, { variantId, level, seed }, { sourceHash, toolHash }, { sha256 })` is the pure,
read-only consumer; `reuse(directory, query)` of `generator/tests/mega-contract.js` adds the directory, the current
identities (`currentIdentity()`) and the engine check (`loadRecords(directory)` reads the files). It returns
`{ ok, id, reasons, unavailable, recorded, generation: 'reused', result }`.

- **What answers.** Only the invariant occurrences: mega16 seeds 1 and 2, mega12 seeds 1, 2 and 3 (`<board>-invariant-<seed>`).
  A CV5 repeat is never chosen to fill a seed, and a missing or failed record is never replaced by another puzzle.
- **What must match before anything is decoded** (every mismatch is a refusal reason, nothing is thrown): board,
  Nightmare and the literal seed; the immutable request; the normalised configuration (default symbol set, symmetry,
  dig order, the board's default attempts 4 or 2, trace off) against the caller's `config` or the one now; the
  allowance; the engine `sourceHash` and the tool `toolHash` now; `checksVersion`; the manifest hash; the budget; the
  wire (it decodes, `puzzleDigest` and `wireDigest` hold, its seed, configuration, attempts, exact flag, warnings and
  rating agree with the record, and the flags and the pure checks are derived again from the recorded rating).
- **What it returns.** `result`: a fresh decoded copy (`SG.replay.fromPlainWire` of a clone; the records are not
  mutated); `recorded`: the original generation time and check time, attempts, exact flag, warnings, the tool's
  correctness verdict and its failed checks, Node, commit, start time; `generation: 'reused'`. An `unavailable` request
  (a `generation-error` record) returns its error code, phase and time and no puzzle.
- **What it does not do.** It does not replace CV3's own checks: the caller applies its own per-puzzle checks
  (validity, uniqueness, givens, requiredness, warnings) and its own availability threshold to `result`, and treats
  `recorded.correctness` only as information. The original generation time is kept as it was, never a new guarded
  240 s generation. Reusing the invariant puzzles does not collapse CV5's independently generated repeats.
- **Tested** (the `mega-contract` suite, synthetic records): a frozen input is accepted and left untouched, the
  decoded arrays are typed copies, CV5 repeats and other seeds, levels and boards are refused, stale sources, tool,
  configuration, allowance and checks version are refused, a tampered wire or digest and a wrong exact flag are
  refused, an unavailable request is returned as such, and a record whose own checks failed is still handed over so
  that CV3's checks decide.
- **For b3 to know.** A suite run by the Node runner has no `require`, so it cannot compute `sourceHash` and `toolHash`
  itself: use a Node-side entry point (`require('./mega-contract.js').reuse(directory, query)`, with the engine
  loaded as the runners do), or the reconciliation's `identity` and a Node helper. A later change of the two hashed
  tool files or of an engine source makes the records incompatible (`reconciled.json` `identity.currentMatches` says
  it at reconcile time); a changed engine needs fresh records.

## Acceptance

| ID | Result | Evidence |
|---|---|---|
| MS05r5m-B01 | Met | The old quick latency promise (6 s, 20 s) is gone and nothing quick promises it: the quick tier has a real one-attempt mega12 request under a documented smoke limit (15 s times the factor, measured 5.20, 5.19 and 5.21 s) and a scripted mega16 control; all 14 original requests, every `checkInvariants` assertion and the CV5 relations are in the deep records, reconciled (14 of 14, 6 relations) |
| MS05r5m-B02 | Met | Every one of the 14 ended in a fallback that carries both warnings and `exact` false; the tool's checks derive exactness and the warnings from an independent rating, a fallback never waives a check and no fallback is counted as an exact hit (0 of 14 exact); the offers stay for MS18c's final qualification (S-OD4 (c1)) |
| MS05r5m-T01 | Met | Exactly 14 occurrence ids, each once, one record each, seeds 1, 2, 3, 4, 3, 3 and 4 per board, the default attempts 4 and 2 with no explicit number (checked in the record, the wire and by the quick suite), the three CV5 relations per board evaluated and passing, the extra ones marked as not original |
| MS05r5m-T02 | Met | Valid, unique, sound, exact flag and both warnings are checked on every returned puzzle (15 checks, each recorded `true`, `false` or `null`); timings, margins and the guard are explicit; nothing was unevaluated in this run, and the suite proves that an unfinished check or a failed request stays `null` and a relation stays `unevaluated` |
| MS05r5m-T03 | Met | One request per process and lock (500,000 ms inside a 540 s process, 15-second gaps, lock waits to 260 s, no command above 118.1 s of node time); no whole DEEP branch, no dropped repeat, no changed seed or time factor |
| MS05r5m-T04 | Met | The mega12 smoke ran three times (5.20, 5.19, 5.21 s) and the three scripted mega16 size-default controls through `--filter="mega16 size-default"` (`--results`, selected total 3, all passed); the old to new mapping is above and the draft manifest was refreshed (`quick-manifest.json`: 3,207 of 3,207 and 1,683 of 1,683 tests claimed once, 0 missing, 0 duplicate, 0 unexpected) |
| MS05r5m-T05 | Met | The reuse interface above, with its refusals tested on scripted records; b3 keeps its own checks and thresholds and the original times |
| MS05r5m-T06 | Met, with the S-OD4 items below | `mega-contract`, `ui-contract` and `help`: 134 of 134 (`quick/mega-contract-ui-contract-help.json`); docs: `generator/design.md`, both developer guides, `notes.md`; no user-guide change (no stated performance promise concerned the tier); CI handoff below |

### Handoff

- **MS05b3:** the records `mega16-invariant-1`, `-2` and `mega12-invariant-1`, `-2`, `-3` (compatible with the current sources
  and tool); the interface above; the generation times to keep (mega16: 116.951 and 103.606 s; mega12: 23.7, 23.5 and
  23.6 s; none near the 240 s guard); every one is a shallow fallback (exact false), so CV3's own requiredness and
  warning checks apply to fallbacks, and any hit-rate or availability threshold of its own is a named item, not a stop.
- **MS05r6a:** compare `identity.currentMatches` after its G13 persistence; the hashed files are the engine sources and the
  two tool files, so persistence work in `tests/replay-fixtures.js` and `tests/fixtures/replay-recording.js` does not
  invalidate the records; a meaningful engine, default or check change requires fresh affected records.
- **MS05r6b:** reconcile `reconciled.json` and the records instead of regenerating; use `quick-manifest.json` of this
  folder as the draft manifest (the `mega` shard has the same 111 tests; `mega-contract` is in `own-fast`; the
  projections are still planning ceilings, none measured here).
- **MS05r6c:** the deep tier is a tool, outside CI; the quick manifest names `mega-contract` (37 tests, 1.7 s) and the four
  new `mega` tests; the workflows state that the offline records replace the old callbacks.
- **MS07b:** the Hell 1 rows are unchanged and renumbered (`mega#76`, `#77`, `#90`, `#91`); the same quick/deep rule
  applies in advance with `mega-contract` as the model (a population per board and level, the same relations).

## Items (S-OD4)

Open items after this step. Route before MS07e: MS07e; final: MS18c (availability), MS18d (cost); MS18e audits all.
No new id was needed: the findings of this step belong to S-AV02 and S-AV03.

| Item | Origin, request, source | Numbers and outcome now | Evidence | Next owner |
|---|---|---|---|---|
| S-AV01 Greater-Than Normal CV6 | inherited | 2,035 ms p95 against 1,400 ms; not run here | none new | MS05e, MS07e, MS18d |
| S-AV02 mega12 Nightmare | the 7 deep records (seeds 1, 2, 3, 4, 3, 3, 4), 4 attempts, 256, source `fee8b8d6…` | 23.520 to 25.243 s (median 23.723 s), all inside the 30 s qualification p95 budget and far over the replaced 6 s quick assertion; **0 of 7 exact**, 7 shallow fallbacks (0 of 4 distinct seeds), against the 36 of 40 an offer needs; reported guard 40 s (margin 14.741 s); one-attempt quick request 5.2 s | `records/mega12-*.json`, `reconciled.json`, `quick/mega12-smoke-*.json` | MS07e, MS18c (availability: the cell will miss its hit rate), MS18d |
| S-AV03 mega16 Nightmare | the 7 deep records, 2 attempts, 256, source `fee8b8d6…` | 80.394 to 116.951 s (median 104.106 s): **7 of 7 over the 30 s p95 budget** (2.7 to 3.9 times), none over the 120 s application guard as measured here, but `mega16-invariant-1` used 116.951 s (97.5 %, 3.0 s left); **that 97.5 % was measured in Node, synchronously, with trace off, whereas the application's 120 s guard applies to a worker run with trace on, so in practice this request is at or over the application guard**; **0 of 7 exact** (0 of 4 distinct seeds), the seed-3 exact hit at attempt 6 (r4: 310.2 s) is given up by design; reported guard 180 s (margin 63.018 s); CV3 reuse is far inside its 240 s guard | `records/mega16-*.json`, `reconciled.json` | MS07e, MS18c (availability), MS18d (cost) |
| S-AV04 samurai Nightmare (G13) | inherited | 21.6 s at 2 attempts (r5p); `steps`, `replay`, `player` regenerate it once per process until MS05r6a persists it; not touched here | none new | MS05r6a, MS07e, MS18c/MS18d |
| S-AV05 Killer Hard | inherited | 0 of 12 exact at every R5 setting; not touched | none new | MS07e, MS18c |
| S-AV06 Killer Expert | inherited | 0 of 12; as above | none new | MS07e, MS18c |
| S-AV07 classic9 Nightmare | inherited | 2 of 12; unchanged | none new | MS07e, MS18c |
| S-AV08 standing quick cost | inherited; updated here | Generator quick inventory 3,207 tests in 49 suites (before 3,170 and 48): `mega-contract` 37 tests, 1.7 s; the `mega` shard (111 tests) drops the four Nightmare tests (at 8 attempts MS05r4 saw 48.2 s for one of them and 60 s guards for two) and gains the one-attempt request (5.2 s) and three scripted controls (0.1 s together); the projections of the manifest are still ceilings (sum 1,740 s) and none was measured: MS05r6b's measurement; MS07e's proposal if the Generator stays above about five minutes | `quick-manifest.json`, `inventory-diff.json` | MS05r6b (per-app measurement), MS07e |

Open and inherited, not an S-AV item: CV6-04 (the legacy 8 on small boards), non-blocking, with MS05r5p's fix-round
option before MS05r6b if the plan author chooses (b).

## Deviations and risks

- Nothing in the tool, the quick suite or the records is a deviation from the task text. The scripted mega16 control runs at
  the Expert tier (reason above); the guard factor 1.5 and the 5 s step are this task's choice of the "explicit margin"
  and are in the tool's rule text.
- The smoke limit is a guard against a gross slowdown on a busy machine, not a performance target; it is 5.8 times the
  measured seconds here and 8.7 times on CI, both under the unchanged 60,000 ms request budget. A slower runner
  than this one could still exceed it: that would be a recorded time failure, not a reason to raise the factor.
- The fixture and the tool are 1,242 and 275 lines with some lines over 110 characters (the convention binds the
  engines); they were fixed before the first record because a later edit would have changed `toolHash` and made the
  records stale.
- The mega quick tests of the 8-attempt era are history in `evidence/MS05r4/` and are not rewritten.

## Files

Created: `generator/tests/mega-contract.js`, `generator/tests/fixtures/mega-contract.js`,
`generator/tests/suites/mega-contract.test.js`, and this folder: `records/` (14), `reconciled.json`, `quick/` (5 result
files), `logs/`, `runs.jsonl`, `Invoke-Dv3Node.ps1`, `Run-Dv3Logged.ps1`, `Run-Preflights.ps1`, `shard-plan.json`,
`manifest.js`, `quick-manifest.json`, `generator-inventory.json`, `player-inventory.json`, `preflight/` (8),
`inventory-diff.js`, `inventory-diff.json`.
Changed: `generator/tests/suites/mega.test.js` (the replacement and its header; nothing else), `generator/tests.html`
(the fixture and the suite entry), `generator/design.md`, `DEVELOPERGUIDE.md`, `DEVELOPERGUIDE.vn.md`,
`docs/difficulty-v3/notes.md`. Unchanged on purpose: every engine file, the canonical fixtures, the support lists, the
workflows, the user guides, the task pack and the logs, and the evidence of MS05r5 and MS05r5p. The scratch folder
`generator/tests/artifacts/difficulty-v3/MS05r5m/` is deleted.
