# MS07b evidence: the four chain windows registered, the strict check gate, E, the Hell 1 pilot and the mega Hell 1 contract

Branch `rating-v3`, HEAD `959aae0` (MS07a), nothing staged or committed (only read-only git commands were used). Start
2026-11-15T02:31:54+07:00. Node v26.13.0, Windows x64. Every command that could take more than 10 s went through the
sudoku lock wrapper (`Invoke-Dv3Node`, 540 s ceiling, compounds planned at 450 s or less, 15 s between commands).
There is no diagnosis gate in this task.

## 1. Verdicts

| Item | Result |
|---|---|
| Registration | `forcingChain` 1..C, `forcingChainLong` C+1..12, `nishio` depth 1, `nishioDeep` 2 (3 on request); C = `SG.chainSearch.SHORT_MAX` = 6, read at every call; baseCost 90 / 118 / 140 / 210, orders 190 / 198 / 200 / 202, weights 1100 / 1400 / 1700 / 2600 |
| IR54 | all four wrappers pass the ID, both bounds and `workLimit` explicitly: `forcingChain` and `nishio` unbounded (`Infinity` in the private spec), the two new IDs 50,000 |
| IR52 | strict gate: a bounded call never lets more than 256 work units pass between two checks; oversized expansions are split into pieces of at most 256 edges; the unbounded legacy cadence is unchanged |
| IR55 | provenance below (section 2); a fixture mismatch fails the cost record and the CLI (exit 1); the sandbox of `pattern-cost-tools` is per run under the ignored `.scratch-pattern-cost-tools/` |
| E (GG / GR) | on the final source: 5 of 5 wires and 14 of 14 analyses match, 520 of 520 hashes unchanged against the refreshed fixtures; the refresh itself changed 6 of 520 hashes (all Nightmare) and 1 of 14 analyses (G14), wires none (section 4) |
| GH | 28 examples; `forcingChainLong` and `nishioDeep` are real replays (section 5) |
| Hell 1 pilot | 2 requests, 5,354.2 and 4,930.8 ms generation, both in band and shallow (0 of 2 exact); GD 20 x mean = 102.8 s, GQ 40 x mean = 205.7 s (section 6) |
| Mega Hell 1 | 14 of 14 records on the final source, correctness pass, 6 of 6 relations pass; 0 of 14 exact; one request over 120 s (section 7) |
| Quick sets | Generator 3,449 of 3,449 (744.9 s over the four CI groups), Player 1,749 of 1,749 (34.4 s), fingerprints `f752e35b...5e0e44` and `f0749637...6fe2b6` (after the IR57 user-guide fix), all `sourceStable`; `generator-suites.sh check` exit 0 (3,449 of 3,449 in exactly one shard) |

## 2. Input identities of the differentials (IR55)

The accepted MS07a input was captured before the first edit of this task.

| File | Git blob | SHA-256 (raw blob, LF) | SHA-256 (CRLF working-tree materialization) |
|---|---|---|---|
| `9dfc9a3:core/js/engine/tech-chain.js` (HEAD's blob at MS07a's start, the original of MS07a's differential) | `efa8a1fe8e656c36c6813e0a8ea99cc4130ddd06` (20,026 bytes, no CR in the blob) | `40bda8ed10e32c034e11bb8619dc9acade85b128bd1bda2875e1fb6ace5bc2c9` | `02733d67c0c41d98423a702c2de8bc690d9fe406f8284bcdbe6787cebb785c8d` |
| `959aae0:core/js/engine/tech-chain.js` (the accepted MS07a source) | `1bfa557a8711c1923d006697df2be1b3793b0667` (28,518 bytes) | `f8985bd2027d2327bd5d57f1c3c0d6d39c480ca6fa05f4b6469cefa9fecec6f8` | `5942409a9554abb203e5ada84615c310acadbfb3e05002845b273771f86cb53a` (the working-tree file at the start of this task; also the file `generator/tests/artifacts/difficulty-v3/MS07b/accepted-ms07a-tech-chain.js`) |
| `core/js/engine/tech-chain.js` at the end of this task (CRLF, 35,122 bytes) | the working-tree file | not applicable (not committed) | `9223ff39912c9b33b9aefc52469e610d3efc9eed05bc014d11e04bb070cc8dd7` |

The newline conversion is the checkout's LF to CRLF; the raw blobs have no CR. The MS07a differential compared the original
(`9dfc9a3` blob above) with a candidate whose own file identity was **not recorded** in MS07a's evidence; the preserved record
shows only that the overhead run's digest `e872019b7ce2...` equals the differential's (`evidence/MS07a/transcripts.txt`, lines 21,
23 and 29). The accepted `959aae0` snapshot is the nearest immutable identity and is **not** claimed to be that intermediate
candidate. The MS07b differentials below name the exact files they compared: the accepted MS07a snapshot (`5942409a...`) and
the final MS07b file (`9223ff39...`). The combined engine fingerprint of the ledgers (`sourceHash`) is a different number and is
not any one file's hash.

**Wrapper cost, historical (not a new finding).** MS07a's final wrapper measured 428.7 against 417.8 ms find-only (+2.6 %) on its
mostly-short-find corpus, with no visible change in the standing quick set (690.2 against 690.7 s):
`docs/difficulty-v3/evidence/MS07a/evidence.md` section 4 and `transcripts.txt`. It is a microbenchmark of the MS07a source, not a
generator-wide slowdown and not an S-AV item; the carried note is in `docs/difficulty-v3/notes.md` (MS07b).

## 3. The engine, the tests and the checks of the checks

**Files of the engine change:** `core/js/engine/tech-chain.js` only (header, wrappers, `SHORT_MAX`, the strict gate with `expand`,
the two registrations); `generator/js/engine/difficulty.js` (two weights); the four locale files (both apps, both languages: name,
description and the step texts of the two new IDs).

**Tests added** (counts before to after): `tech-chain` 89 to 107 (+18: the four windows on their own, C = 4 and 6, `SHORT_MAX` read
at every call and refused when invalid, options that only narrow, a partition of the proofs, the explicit work policy of each
wrapper against the legacy unbounded one, 7- and 8-link proofs of real puzzles, and the IR52 / IR54 block: gaps of at most 256 on
stars of 40, 100, 250 and 300 spokes, the exact 256 boundary, a Finding in the middle of a piece on a hub of 300 spokes, the legacy
cadence, Nishio's per-trial checks, a swallowed budget that the caller still finds); `techniques` 169 to 186 (+17: 23 / 28
registry, the history-versus-registry relation, real fixtures and supplements of the four IDs); `pattern-cost-tools` 28 to 32
(+4: matching and mismatching records, the falsely asserted `complete: true`, the measure loop, the scratch isolation);
`difficulty-diagnostics` 84 to 85 (+1, see the deviations); `mega-contract` 37 to 44 (+7: the Hell 1 manifest); `mega` 111 to 108
(-4 quick Hell 1 full-attempt requests, +1 real one-attempt mega12 Hell 1 smoke). Generator 3,405 to 3,449, Player 1,714 to 1,749.

**Checks of the checks.** Each was applied to `tech-chain.js` by hand, the suites run and the engine restored (the final file has
no mutation text): M1, the old modulo gate: 4 tests fail; M2, no splitting of oversized expansions: 4 fail; M3, the checkpoint
not updated after a root check: 2 fail; M5, `forcingChain` accidentally limited to 50,000: 5 fail. All four were detected.

**Existing tests whose premise or pin changed (each with its reason).**

| Test | Change | Reason |
|---|---|---|
| `generator/tests/suites/help.test.js` | Hell 1 lists `['nishioDeep']` | the Hell 1 tier is no longer empty |
| `generator/tests/suites/difficulty-floor.test.js` | LABELLED Nightmare row `[false, true, false]` | `constructed-nightmare-2` now needs the Nightmare tier (below) |
| `generator/tests/fixtures/rated.js` | `V3_EXPECTED['constructed-nightmare-2']` `['nightmare', false]` to `['hell1', false]` | two 7-link `forcingChainLong` steps (weight 1400) raise its score to 2632, inside Hell 1; `required` stays false |
| `generator/tests/suites/difficulty-diagnostics.test.js` | the Hell-1-vacuous premises moved to Very Easy and a synthetic empty tier; one position test added | Hell 1 has a tier now; the suite belongs to MS07c, the premise edit is minimal |
| `generator/tests/suites/replay.test.js` (G14) | the compact audit of G14 has exactly one avoided jump, as G04 | G14's depth-2 step is now `nishioDeep` after a `nishio` step of 3,603: position 72 bridges the former jump |
| `generator/tests/suites/pipeline.test.js` | the capped-trace test uses Nightmare seed 26 (exact on attempt 4, 8,348 events, 670 steps, capped to 1,999) instead of Hell 1 seed 21 | a classic9 Hell 1 request now needs `nishioDeep` and spends all eight attempts (seeds 21 to 32: 1,540 to 1,629 step events, about 18,000 in all): the minimal capped trace of seed 21 is 2,225, above the cap of 2000, whatever the cap thins (`transcripts/pipeline-trace-seeds*.txt`) |
| `player/tests/suites/help.test.js` | 26 to 28 techniques (the strings and the registry count) | two registrations |
| `generator/tests/manual/difficulty.test.js` (heavy, not run) | `firsts`, the weights table, the one-expensive-step list and the famous puzzles' `hardestTechnique` (`nishioDeep`) | contracts verified on a scratch script (`check-manual-contracts.js`, output kept in `transcripts/check-manual-contracts.txt`: the tiers of the levels, `forcingChain` 1,383 Master, `forcingChainLong` 1,758 and `nishio` 2,133 Nightmare, `nishioDeep` 3,258 Hell 1, the four famous puzzles Hell 2 with `nishioDeep` as hardest technique, and the three constructed Nightmare puzzles still solved by the historical `chains` set and stuck with `wings`); the suite itself was not run |

Under the new registry only `constructed-nightmare-2` changed its reference classification; the famous puzzles stay Hell 2, whose
requiredness is vacuous as before (the tier of Hell 2 is empty), and their hardest technique is now `nishioDeep`. Nothing was fitted to a
label; no weight, band or offer was changed beyond the two new weights.

## 4. E (GG / GR / GH): the refresh

Plans: `generator/tests/artifacts/difficulty-v3/MS07b/plan-{wire,analysis,hashes}.json` (each shard with its own projection, twice
MS06c2's measurement of the same shard plus 5 s). Shard drivers `run-shards.cjs` (one child process per shard, exit code kept).

**First pass** (before one comment-only edit of the engine header that `purity` required; superseded, kept in
`superseded-first-source/`): wire 5 shards 66.9 s, analysis 14 shards 90.0 s, hashes 104 shards 468.3 s (two compounds, 393.8 and
74.7 s); no shard over its projection. The merges before writing: wires 5 of 5 **match**; analyses 13 of 14 match, **G14** differs
(25 fields, `analysis-check-before-write.txt`); hashes **6 of 520 changed** (`hash-check-before-write.txt`). The fixtures were
written (`replay-goldens.js` 488 lines, `regression.js`; `replay-wire.js` unchanged) and the checks repeated clean.

**Final pass** on the final source (the engine header comment changes the 63-source fingerprint, so every ledger was recorded again):
wire 5 shards 65.4 s, analysis 14 shards 88.3 s, hashes 104 shards 455.0 s (two compounds, 401.1 and 54.2 s), all exit 0, none over
its projection, slowest `g-hash-diagonalX-nightmare-10` 30.6 s (`shard-runs.jsonl`, `logs/`). The three merges
(`wire-check.txt`, `analysis-check.txt`, `hash-check.txt`) say: 5 of 5 keys match, 14 of 14 match, **all 520 unchanged**, each
"recorded from the current sources". The complete E took 609 s of node time, far below the 10 to 90 minutes estimated.

**The 6 changed hashes and why** (differential on the six requests: the accepted MS07a source `5942409a...` against the final
`9223ff39...`, each seed generated by both, `transcripts/hash-explain-{old,new}.txt`; the old side reproduces the old fixture's
hashes exactly):

| Key | Old hash | Old: attempts, score, steps | New hash | New: attempts, score, steps |
|---|---|---|---|---|
| classic9/nightmare #2 | `b2617ee032a4016c` | 8, 1968, `forcingChain` x6 | `7c21f405e81ddad9` | 3, 2344, `forcingChain` x3 + `forcingChainLong` x1 |
| classic9/nightmare #3 | `9eb005df27ca67fb` | 8, 1956, `forcingChain` x4 | `014f55fe64c7b982` | 5, 2186, `forcingChain` x2 + `forcingChainLong` x1 |
| classic9/nightmare #6765 | `9f3bae9bcddae99f` | 8, 1959, `forcingChain` x3 | `6609cbc059d1792c` | 5, 2207, `forcingChain` x3 + `forcingChainLong` x1 |
| diagonalX/nightmare #89 | `3ab1a0aa31fed606` | 5, 2381, `nishio` x1 | `2664a77a0835c0e6` | 3, 2337, `forcingChain` x1 + `forcingChainLong` x1 |
| diagonalX/nightmare #377 | `cdac43e9b03d91e5` | 8, 2390, `nishio` x1 | `a7dd044fac63df4b` | 4, 2378, `nishio` x1 |
| diagonalX/nightmare #610 | `51d9d3e0d8c2b83c` | 8, 2061, `forcingChain` x4 | `eab7817ac72f1b96` | 8, 2331, `forcingChain` x2 + `forcingChainLong` x1 |

**What the differential proves, and what it does not.** The six differences are caused by MS07b's source: the accepted MS07a source
reproduces the old fixture's hashes exactly and the final source gives the new ones. It does not say which mechanism acted in which
attempt (no per-attempt trace was kept). MS07b changes a dig in four ways, all allowed by the IR54 ruling (SA1's review 16, IR56):

1. **Labels and weights.** A proof of 7 to 12 links is `forcingChainLong` (1400, a Nightmare-tier technique) where it was
   `forcingChain` (1100, a Master technique), and a depth-2 proof is `nishioDeep` (2600, a Hell 1-tier technique) where it was `nishio`
   (1700). This changes which candidates are exact and the scores the guided dig reads.
2. **The allowed sets of the oracles** (`1.25 x weight` below the band maximum): Nightmare's oracle lost depth-2 Nishio (`nishioDeep`,
   3,250, is not below 2,400), which the old `nishio` searched by default, and Master's lost 7- to 12-link chains (`forcingChainLong`,
   1,750, is not below 1,500). The two Master keys of the corpus did not change.
3. **The number of budget checks** (entry and gate checks of the new IDs, and the second scan of the roots or the depth-1 trials by each
   window, which starts at length or depth 1): the dig's objective guard counts them (handoff IR59, section 10).
4. **The 50,000 work limit of the two new IDs.** It could change a rating (a long chain missed, `nishio` instead), but it hardly binds on 9x9:
   SA1 measured a complete negative scan of the long window at 4,562 to 4,851 units on the stuck positions of three famous puzzles.

Attribution, only as far as the records support it:

- **classic9 #2, #3 and #6765, diagonalX #89 and #610:** the new result has a `forcingChainLong` step. The probable mechanism is 1 (with 2): an
  earlier candidate of the same seed is now exact (3, 5, 5 and 3 attempts against 8, 8, 8 and 5), or, where both runs use all eight attempts
  (#610), the fallback ranks another candidate first (2,331 against 2,061). The old results were fallbacks or later hits made of
  `forcingChain` (or one depth-1 `nishio`) steps; the lengths of the old chains were not recorded.
- **diagonalX #377:** the new result has **no** `forcingChainLong` or `nishioDeep` step (one depth-1 `nishio`, score 2,378, exact at attempt 4).
  The same candidate would be exact under the old registry too (in the Nightmare band, required, `nishio` being the old Nightmare tier), and the old run
  went on to attempt 8: the dig itself changed, not the verdict on one candidate. Mechanism 1 cannot explain it. The most likely cause is mechanism 2
  (Nightmare's oracle without depth-2 Nishio); mechanisms 3 and 4 are not excluded. It is not attributed to one mechanism.

"Nothing else in the 520 changed" is a count (the other 24 of 26 keys are unchanged); it is not evidence that one mechanism acted.

**G14** (mega16, Hell 2, seed 12; the only golden that changed, `analysis-check-before-write.txt`): the last guided steps were
`nishio` (4,476, state `F/Final`); they are now `nishio` at 3,603 and `nishioDeep` at 6,408 and 6,453 (compact steps 6 to 8; details
steps 79 both times, the scores of its last six positions changed; 25 fields). **Wires G09 to G13:** unchanged, 5 of 5 match.

**Pins re-derived** (with their reasons in section 3): `replay` (G14's compact audit), `pipeline` (the capped-trace request),
`purity` (the header comment of `tech-chain.js` named a browser global in two comments; reworded), Player `help` (28). `steps`,
`replay-recorders`, `smoke`, `digger-target` and `player` pass unchanged against the refreshed goldens.

## 5. GH: the real help examples

`player/js/ui/help-examples.js` was written by `make-technique-examples.js` (28 examples; `--check` passes on the final tree,
`transcripts/gh-check-final.txt`). Source map: `player/tests/artifacts/difficulty-v3/MS07b/sources.json`.

| ID | Source | How it was acquired |
|---|---|---|
| `forcingChain`, `nishio` | the existing committed sources (a 4-link contradiction chain, Nightmare; a depth-1 Nishio, Hell 1 seed 8, step 17) | replayed first: both still give the shortest-window Finding of their ID under the new registry; `nishio`'s old Hell 1 label is no evidence of depth 2 and its Finding was not relabelled |
| `forcingChainLong` | discovery batch 1 on 12 Nightmare Classic 9x9 puzzles (`transcripts/discover-long-batch1.txt`): Long found in puzzles 2 and 3; recorded seed 3 | the real Player's hints, recorded with `--record-sources` |
| `nishioDeep` | the published puzzle Escargot (Inkala), replayed with the hint code of the Player (`transcripts/record-deep-from-fixtures.txt`); a real unique fixture | a second discovery of 12 Hell 1 puzzles (`transcripts/discover-deep-batch2.txt`) met no depth-2 proof; the discovery ran **before** the fixture search (the brief says fixtures first; the bound was not exceeded) |

Discovery used 2 of the 4 allowed batches and 24 of the 48 requests; nothing was synthesised or relabelled.

## 6. The two-request Hell 1 pilot (provisional C = 6)

Command (final source, `ddf2fa5a...`): `node tests\soak.js --variant=classic9 --level=hell1 --from=0 --count=2 --total-count=2
--seed=20260101 --no-gate --json=..\docs\difficulty-v3\evidence\MS07b\hell1-pilot.json`, exit 0, 15.5 s for the two puzzles
(`transcripts/hell1-pilot.txt`, `hell1-pilot.json`, `complete: true`).

| Request | generation ms | score | in band | exact | shallow | full ratings | forcing chains | Nishio depths |
|---|---:|---:|---|---|---|---:|---|---|
| `classic9:hell1:0` | 5,354.2 | 3,052 | yes | no | yes | 1,356 | 7 steps, lengths 3 to 6 | 1, 1 |
| `classic9:hell1:1` | 4,930.8 | 3,199 | yes | no | yes | 1,212 | 10 steps, lengths 3 to 6 | 1, 1 |

Mean 5,142.5 ms. Projection of the unchanged 20-request Hell 1 GD batch, `20 x mean`: **102.8 s**; of the serial-equivalent first 40
GQ requests, `40 x mean`: **205.7 s** (an estimate, not a proof: GQ's jobs-4 scheduling and early stops). With the whole run's
7.75 s per request (the soak's own reference and path checks included): 155 s and 310 s. Both are well below 450 s. Defaults and
source: `SHALLOW_SEARCH_RATINGS` 256, eight attempts (classic9), C = 6, weights as registered. Neither request is exact: the
chain steps stay within 6 links and Nishio at depth 1, so no puzzle needed `nishioDeep`; the pilot requests are not selection hits.

## 7. The mega Hell 1 contract (S-OD4 / CV6-03 (1))

The tool `generator/tests/mega-contract.js` and its helpers (`tests/fixtures/mega-contract.js`) got a second, **level-selected**
manifest: the same fourteen occurrences per level (per board the invariant seeds 1 to 4 and the CV5 calls of seed 3, 3 and 4, at the
board defaults of 4 and 2 attempts, no explicit `maxAttempts`) with level-qualified ids `<board>-hell1-<role>`, its own manifest hash
(`243452b905f7...` listed; the Nightmare manifest, ids and hash are unchanged, pinned by a test) and record kind
(`mega-hell1-record`, `mega-hell1-reconciliation`), the same six relations, `--list` and `--reconcile` selected by `--level=hell1`, and
`--request=<id>` found by its id. The quick suite lost its four full-attempt Hell 1 tests (per board the four seeds and the CV5 test: the
fourteen requests of the manifest) and gained a real one-attempt mega12 Hell 1 smoke (seed 3; measured 7.74, 7.75 and 7.74 s for the request and its checks in three locked
runs, `transcripts/mega12-hell1-smoke-{1,2,3}.txt`; limit 18,000 ms before the time factor, 36 s here and 54 s on CI, below the 60 s request
budget). The scripted mega16 control (the size-default stop, the two-warning fallback, an explicit number of attempts, a propagated
cancellation or budget error) runs at the Expert tier for the reason the Nightmare control does (the top tiers rate their proposal samples for
real, `spec.proposal`), so it is the stop/fallback control of Hell 1 as of Nightmare; its comments say so. The other levels are unchanged.

**The fourteen records** (one request per locked process, 500 s diagnostic ceiling, the final source `ddf2fa5a...`, tool `7b797b5c...`,
allowance 256, Node v26.13.0; started 04:44:46, ended 05:05:18, `mega-hell1/records/`, `mega-hell1/logs/`; reconciled
`mega-hell1/reconciliation.json`, `mega-hell1/logs/r01-reconcile.txt`: **14 records, complete, evidence sound, correctness pass, 6
relations pass, 0 fail, `currentMatches` source and tool true**):

| Board | Generation (s), min / median / max | Attempts | Exact | Warnings | Over 120 s | Over 30 s |
|---|---|---|---|---|---|---|
| mega12 (7) | 29.336 / 34.235 / 34.392 | 4 of 4 each | 0 of 7 | `difficulty.approximate` and `difficulty.shallow` each | 0 | 6 |
| mega16 (7) | 99.919 / 116.653 / 123.272 | 2 of 2 each | 0 of 7 | both each | 1 (`mega16-hell1-invariant-1`, 123.272 s) | 7 |

Checks 0.026 to 0.079 s per request; the guard of the tool (1.5 x the largest time, steps of 5 s) is 55 s for mega12 and 190 s for
mega16, with margins of 20.6 and 66.6 s. No request exceeded 240 s, none failed a check, none ended in an error. For comparison, the
historical MS05r5m Nightmare records (a different source, `fee8b8d6...`, not measured again here) have mega12 23.5 / 23.7 / 25.2 s and
mega16 80.4 / 104.1 / 117.0 s: Hell 1 costs about 44 % more on mega12 and 12 % more on mega16. The first set of fourteen records, on the
source before the header-comment edit, is in `superseded-first-source/mega-hell1/` (mega12 29.3 to 34.5 s, mega16 99.4 to 123.2 s, the same
verdicts).

## 8. Quick sets and the CI check

Final run on the final tree (after the fix round of SA1's review 16, whose IR57 edited both user guides, which are inputs of both quick
fingerprints), one CI group per locked command (`generator-quick.js run <group> --results-dir=quick`, then the Player
`node tests\node-runner.js --results=...`; `run-final-quick.ps1`; the four groups ran 06:03 to 06:17, the Player at 06:17; `quick/log-*.txt`,
`quick/*.json` with `complete: true` and `sourceStable: true` in all nine files). **Generator fingerprint
`f752e35b5c99a02998f7dc5a62f35b6859bace07568c5a2734fbe2aa045e0e44` (all eight shards), Player fingerprint
`f0749637b7a0d363d9e269ed44c3e48945b156f7b038614dfef23c391a6fe2b6`.** The ledgers carry other source identities: the pilot and the fourteen mega
records `ddf2fa5ad4498e7534b22e8ca3492e9bc7961526f1775db451a580399fded000` (the 63 engine and UI sources alone), the five wire and fourteen
analysis ledgers `9fe78e3a...` (the 63 sources and the four recorder files), the 104 hash ledgers `ed6b9f2e...` (the 45 engine sources and the three
perf files); each merge says "recorded from the current sources" (SA1's review 16 recomputed all three). The user guides are not among those
sources, so E, the pilot and the mega records stand.

| Group (one locked command) | Shards (tests, seconds of the runner) | Command seconds |
|---|---|---:|
| `shared-small` | core-shared 1,209 (26.2), steps 57 (18.8), replay 154 (18.3), mega 108 (12.9) = 1,528 | 79.32 |
| `own-suites` | own-fast 1,623 (167.6), digger-target 75 (1.6) = 1,698 | 171.22 |
| `pipeline` | pipeline 154 (327.4) | 328.43 |
| `replay-player` | player 69 (164.3) | 165.93 |
| **Generator** | **3,449 of 3,449 passed, 0 failed, 0 skipped** | **744.90** |
| Player (`node tests\node-runner.js`) | **1,749 of 1,749 passed** (33.8) | 34.43 |

Before and after: Generator 3,405 to 3,449 (+44), Player 1,714 to 1,749 (+35). `bash .github/scripts/generator-suites.sh check`: **exit 0**
(4.2 s): "Every quick test is in exactly one shard (3449 of 3449), no manual or unknown suite, no empty shard, every job inside its limit";
`generator-suites.sh selftest`: 50 checks, 0 failed (`quick/ci-check.txt`). The manifest `.github/scripts/generator-quick.json` has the new
counts and seconds (taken from the run before the fix round: the shards differ by at most 2 s), no suite or shard added, no projection raised
(pipeline 327.4 of 360 s, player 164.3 of 180 s). The focused `help` suites were run first with the edited guides (Generator 30 of 30, Player 27 of 27,
`transcripts/fix-help-{generator,player}.txt`).

**Earlier runs, kept:** `quick-first-pass/` (before the three pins of section 3 and the header comment: exactly four failures, none a generation or
soundness error: `replay` G14 (one assertion), `purity` (two comments naming a browser global), `pipeline` (the capped-trace request) and Player
`help` (a registry count of 26)), and `quick-before-ir57/` (the complete final run before the user-guide fix: Generator 3,449 of 3,449 in 739.20 s,
fingerprint `a56f1350...5d54d1`, Player 1,749 of 1,749 in 33.59 s, `ebdceab3...bf041c`, check exit 0). Their fingerprints differ from the final
ones by design.

## 9. Named items (S-OD4: numbers, not stops)

Inherited list unchanged: S-AV01 to S-AV15, S-AV18 to S-AV23 (S-AV16 and S-AV17 withdrawn), MS05r6a-COV01. Numbers below are
proposed, for the orchestrator to confirm. Time-only findings, none a stop; every correctness, evidence and soundness check passed.

| Item | Numbers | Route |
|---|---|---|
| **S-AV08** (standing quick cost), re-measured | the four Generator groups 744.9 s on the final tree (739.2 s in the run before the user-guide fix) against 690.2 s at MS07a (+54.7 s, +7.9 %; +49.0 s, +7.1 % in the first run): attribution from the first run's per-test comparison, which the second repeats within 2 s per shard: `player` shard 133.1 to 162.4 s (164.3 s finally) (+29.3 s: the replay of the goldens, G14 above all, "real top-level results ... (mega16, classic9)" 115.1 to 134.5 s, the step texts 9.2 to 16.7 s, the 13 titles 1.8 to 5.5 s), `steps` 11.4 to 18.7 s (+7.3 s, one test over the 14 goldens), `replay` 10.6 to 18.1 s (+7.5 s, two tests), `pipeline` 322.8 to 327.6 s (+4.8 s, the three instrumentation-cost tests), `mega` -0.2 s, `own-fast` -1.4 s (+0.9 s finally), `core-shared` +1.3 s (`compare-quick.js` per test). The cause is G14 (mega16 Hell 2): its analysis now rates `nishioDeep` positions. Projections: pipeline 327.4 of 360 s, player 164.3 of 180 s (91 %), the jobs 630 to 1,260 s of 1,800 s | MS07e, then MS18d |
| **S-AV24** (new), mega Hell 1 request time | against the **120 s application guard**: mega16 99.9 / 116.7 / 123.3 s (min / median / max of 7), one request over it (`mega16-hell1-invariant-1`, 123.272 s), mega12 0 of 7; against the **30 s qualification figure**: mega12 29.3 / 34.2 / 34.4 s, 6 of 7 over it, mega16 7 of 7 over it; none over 240 s; the Nightmare records of MS05r5m (other source) were 23.7 and 104.1 s median | MS07e, then MS18c (availability) and MS18d (cost) |
| **S-AV25** (new), Hell 1 exactness not reached in the deep population | 0 of 14 mega Hell 1 requests exact (all 14 truthful two-warning fallbacks, in band for 14 of 14 by their score), 0 of 2 classic9 pilot requests exact (both in band, shallow), and no depth-2 step in the 12 Hell 1 puzzles of the discovery batch (`transcripts/discover-deep-batch2.txt`): **no `nishioDeep` step in 28 Hell 1 generations on this source**. No hit rate is measured by this task. **Expected at MS07e: the classic9 Hell 1 GD batch (at least 90 % exact of 20) fails**, an availability result and the expected consequence of FS18/FS19, not a regression of this task | MS07e (GD, GQ), MS18c |
| **S-AV26** (new), classic9 Hell 1 request time | pilot 5,354.2 and 4,930.8 ms generation (mean 5,142.5 ms) against the section 9.1 budget of 2,500 ms, both `SLOW`; GD projection 102.8 s, GQ projection 205.7 s (155 s and 310 s with the soak's own checks), all below 450 s. An indication only: two requests in Node on the development machine, not section 9.1's p95 of 50 runs on the reference machine; related to S-AV19 (section 9.1 flags); the GD's own time assertion (median below 5,000 ms times the time factor) is looser and not threatened | MS07e, MS18d |

None of these changes a recorded decision; no weight, band, offer, cap, floor or budget was changed to make anything fit, no
`SG_TIME_FACTOR` or browser guard was raised, and no process ceiling was raised.

## 10. Deviations from the task file, handoffs

**Deviations from the task file** (each a decision, none changes a binding ruling):

1. `difficulty-diagnostics.test.js` (MS07c's suite) got a minimal premise edit (+1 test): its Hell-1-vacuous verdict and summary tests assumed an
   empty Hell 1 tier, which `nishioDeep` ended; the premise moved to Very Easy and a synthetic empty tier, and one test shows that Hell 1 has a tier.
2. `generator/tests/manual/difficulty.test.js` (heavy) was edited for the new contracts and **not run**; its contracts were checked on a
   scratch script (`check-manual-contracts.js`).
3. The `nishioDeep` example comes from a published fixture (Escargot), and the Hell 1 discovery ran before the fixture search where the
   brief says fixtures first; 24 of the 48 allowed requests were used, nothing synthesised.
4. "A scripted mega16 hell1 stop/fallback control": the existing scripted controls run at the Expert tier because the proposal samples of
   Nightmare and Hell 1 are rated for real, and the policy does not depend on the level; they were relabelled (comments) as the control of both levels
   rather than duplicated at Hell 1, which a scripted strategy cannot do.
5. A comment-only edit of the engine header (the `purity` suite forbids a browser global in a source, and two comments said "window")
   changed the source fingerprint after E, the pilot and the first fourteen mega records had been recorded, so they were **recorded again on the
   final source**; the first set is kept in `superseded-first-source/` and gives the same verdicts and numbers.
6. The capped-trace request of the `pipeline` suite changed (Hell 1 seed 21 to Nightmare seed 26), the G14 audit pin of `replay` and Player
   `help` (28): section 3.
7. Pre-announcing E to the orchestrator cannot be done in this non-interactive run; the lock files of the helper were the slot, and the
   improve-generating job ("IG") held the lock at least once (E, 03:46) and was waited for, never touched.
8. Only read-only git commands (`status`, `show`, `diff`, `check-ignore`, `hash-object`); no pack, check-list, log or clarification file was edited.
9. `.scratch-pattern-cost-tools/` (an empty, ignored base folder) was left by the `pattern-cost-tools` suite's own cleanup rule (only the run's
   own folder is removed); it was removed at the end of the task.

**Handoffs.** MS07c: the soak `--chain-window` override and the cost records; `difficulty-diagnostics.js` collects chain lengths and Nishio
depths only for `forcingChain` and `nishio`, so the diagnostics miss `forcingChainLong` and `nishioDeep`; the selection of C (the pilot is at C = 6;
the two requests used chains up to 6 links and depth 1 only, so C = 4 would change the source and the pilot must be repeated); the cost tool must
reject mismatched records (a consumer of old records) and keep the caller-budget recheck.
**IR59 (to MS07c and MS07e):** the dig's objective guard (`boundedObjective` in `digger.js`) refuses a removal (`REFUSED_TECHNIQUES`) after
`OBJECTIVE_STEPS` = 100,000 budget checks, and every `ctx.check()` of a finder counts. From Nightmare up MS07b adds checks to the oracle's
solves: the entry and gate checks of `forcingChainLong` (and of `nishioDeep` from Hell 1) and a second scan wherever the short or shallow ID
finds nothing (each window search starts at length or depth 1, so the long window repeats the short one's roots: on the stuck positions of three
famous puzzles it costs the same 4,562 to 4,851 units and adds about 19 gate checks, doubling the chain-scan work there). The guard's margin was
measured on the old cadence (about twice the costliest 9x9 solve, 44,000), and larger boards with longer scans are the likelier place to meet it.
Nothing is changed here (R5 fixes the bound; the IR54 ruling allows budget-bound outcomes); the statistics do not tell a guard refusal from a stuck
solve. Count it among the possible causes of any availability or cost movement after MS07b; it becomes an S-OD4 item if it shows, not a stop.
**IR60 (MS07c owns the setter):** `shortMax()` refuses a non-number or NaN and floors anything else, with no range check: C of 0 or less turns
`forcingChain` off and makes every chain long, C of 12 or more leaves `forcingChainLong` an empty window, and `Infinity` lets `forcingChain`
search past R9's 12-link ceiling. R9 allows C = 4 or 6 only; no production path sets C and MS07c's `--chain-window=4|6` validates its own
input, so this is no defect; MS07c may add a range check where it owns the setter.
MS07e: the S-AV items above, the latest applicable pilot (this one, on `ddf2fa5a...`), and the expected outcome of the classic9 Hell 1 GD
batch (S-AV25: at least 90 % exact of 20 is expected to **fail**). MS14b: the scoped `lawOfLeftovers` supplements at the scoped call site of
`techniques.test.js` and the cost tool's scoped adapter (its refusal is kept). MS18e: the final-source rerun and reconciliation of the complete Nightmare and Hell 1 deep
population; the fourteen Hell 1 records here are this task's own evidence (`reuse` for CV3 needs a matching source at the time).

## 11. Where things are

- Evidence: `ledgers`: `wire/`, `analysis/`, `hashes/`; `logs/`; `shard-runs.jsonl`; merges `wire-check.txt`, `analysis-check.txt`,
  `hash-check.txt`; first pass `superseded-first-source/` (ledgers, merges before writing, logs, the first pilot and mega records);
  `quick/` (final), `quick-before-ir57/` and `quick-first-pass/`; `mega-hell1/`; `transcripts/`.
- Scratch and tools (ignored or generated): `generator/tests/artifacts/difficulty-v3/MS07b/`, `player/tests/artifacts/difficulty-v3/MS07b/`.

## 12. Fix round (SA1's review 16, accepted with a text-only round: no code change, no E rerun)

| Finding | Change |
|---|---|
| IR56 | section 4 and the notes: the single cause is replaced by the four mechanisms (labels and weights, the allowed sets, the number of budget checks, the 50,000 limit) and an attribution only as far as the records support it: the five keys whose new result has a `forcingChainLong` step (probably labels and allowed sets), and diagonalX #377, which has none and would be exact under the old registry too (a changed dig, most likely the Nightmare oracle without depth-2 Nishio, not attributed to one mechanism); "nothing else changed" stated as a count |
| IR57 | `USERGUIDE.md` line 111 (21 to 23 techniques) and line 359 (26 to 28), `USERGUIDE.vn.md` line 111 (21 to 23); a grep of the guides, both developer guides, both designs, the README, AGENTS.md and the sources of both apps for other stale technique or example counts found none (the other 26 and 21 hits are the 26 hash combinations, level counts and example scores). Both quick fingerprints changed: the focused `help` suites (30 and 27 tests) and the complete quick sets were rerun on the final tree (section 8) |
| IR58 | section 8 names the right source identities of each ledger set; the notes no longer say the famous puzzles are required "through `nishioDeep`" (Hell 2's requiredness is vacuous; section 3 says so too); S-AV24 gives the 120 s guard and the 30 s qualification figure in both the evidence and the notes |
| IR59, IR60 | recorded as handoffs (section 10 and the notes): the dig's objective guard counts the new entry, gate and second-scan checks (MS07c, MS07e); `SHORT_MAX` has no range check (MS07c owns the setter) |
| IR61 additions | S-AV25 carries the discovery batch (none in 28 Hell 1 generations) and the expected failure of the classic9 Hell 1 GD batch at MS07e; S-AV26 is an indication related to S-AV19; the manual-contracts scratch output is kept (`transcripts/check-manual-contracts.txt`) and summarised in section 3 |

No git command of any kind was used in the fix round. Final identities: Generator quick `f752e35b...5e0e44`, Player quick `f0749637...6fe2b6`
(both changed by IR57); GG ledgers `ed6b9f2e...`, GR ledgers `9fe78e3a...`, pilot and mega records `ddf2fa5a...` (unchanged).
