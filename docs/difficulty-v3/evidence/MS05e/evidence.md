# MS05e evidence index: guided sign dig for Greater-Than

Task `tasks/difficulty-v3/MS05e-guided-sign-dig.md`; the report is
[docs/difficulty-v3/cv6-guided-sign-dig-2026-11-14.md](../../cv6-guided-sign-dig-2026-11-14.md) and the notes are in
`docs/difficulty-v3/notes.md` (section MS05e). Developer: claude-sonnet-5.5. Windows x64, Node v26.13.0, 16 cores, time factor 2,
branch `rating-v3` at `f7be90f` (the label of the before-measurement files; see section A), nothing staged or committed.

**Status: MS05e closes as "set aside"** (CV6-05, the plan author's Q1(b); Q2(a) keeps the contracts). Sections A to H index
what was measured and recorded for the **candidate** (the pool, `SIGN_POOL = 4`) and are history only, except the records of
the unchanged source (`before/`, `gd/before/`), which apply to the restored source by identity. Section I holds the
candidate patch, the restore, the identity proof and what applies by identity. No raw record under the evidence folders
was edited by the disposition.

## A. Source identities

| What | Value |
|---|---|
| Starting tree | `f7be90f`, clean, as every before-measurement file records it (`before/*.json`). `f7be90f` is the pack-notes commit on top of the runtime baseline `00647f9` and carries no source; it was committed at 05:35:55 UTC, five seconds before the first counted run, and the smoke run at 05:34:52 preceded it. All `SOURCE_FILES` `a073f9bdaac0…`; `greater-than.js` `24dbbe37e4e4…` |
| Pool 4 files | `greater-than.js` `1bed3434f5b6…` (`SIGN_POOL = 4`), `sourceHash` `ba2324b46a26…` |
| Pool 8 files | `greater-than.js` `8c626b50c123…`, `sourceHash` `78e95b5460d0…` |
| Pool 16 files | `greater-than.js` `97faf69e901d…`, `sourceHash` `5ee46afaee82…` |
| Candidate final source (set aside) | `greater-than.js` `daecf790bd56e881…` (`SIGN_POOL = 4`). It equals the pool-4 source except for one statement wrapped to stay within 110 characters; `prove-format-only.cjs` reverts that wrap on a copy in memory and reproduces the recorded `1bed3434…` exactly (log in the transcript of the run; the candidate's E evidence is on this source, and the candidate's GD cells apply to it by the statement in section E, "GD applicability"). The restored source is the starting tree (section I) |
| Driver | `generator/tests/artifacts/difficulty-v3/MS05e/measure-gt.js` (hash in every file, `source.toolHash`), `aggregate-gt.js`, `make-e-plans.cjs`, `explore-pins.cjs`, `prove-format-only.cjs`; scratch, not a general tool |
| Locked helper | `Invoke-Dv3Node.ps1` (the check-list helper verbatim, identical to MS05r6c's), `Run-Dv3Logged.ps1` (adds the 15 s gap and `runs.jsonl`), `Run-Measure.ps1`, `Run-Matrix.ps1`, `Run-Gd.ps1` |

## B. Diagnosis, comparison and GD

| What | Where |
|---|---|
| Diagnosis before (Normal 300-319, every sample, minimality verified) | `before/diagnosis.json`, `before/diagnosis.md`. The named trap needs the floor condition (`atFloor`: at most one clue above `spec.minClues`): 83 of the 376 misses (22.1 %), the split in section 2 of the report, computed from the fields `atFloor`, `tuneReveals` and `initialClues` of the JSON. The tool-written `diagnosis.md` (not edited) says "355 (94.4 %) are below the band with a minimal sign set", which is the share of misses below the band, not the trap (every sample is minimal by construction) |
| Diagnosis after, candidate (pool 4) | `after/diagnosis.json`, `after/diagnosis.md` (named trap 94 of 484, 19.4 %; the same split) |
| Unchanged-source timing, 10 files, 240 requests | `before/` (`normal-300`, `normal-7000`, `easy-300`, `hard-300`, `expert-300`, each r1 and r2) |
| Pool 4, 8, 16, same manifest, 240 requests each | `pool-4/`, `pool-8/`, `pool-16/` (pool 16: expert and normal 7000-7039 in two seed shards each) |
| Merged tables of all of them | `comparison.md`, `comparison.json` |
| Per-level CV6 and I5, 18 selectors, selected total 1 each | `gd/final/` (`manifest.jsonl`, `<level>-<cell>-results.json`, `logs/`, `cells.md`) |
| Normal CV6 and I5 on the unchanged source | `gd/before/` |
| Every locked command | `runs.jsonl`, `commands.md` (label, exit, node seconds, lock wait) |

Every measure file records the request, config (no budget, no warm-up, no support override), literal seed list, source
and tool hashes, Node, machine, the lock file content, the pool value (null before the change), the per-request
elapsed time, outcome, score, exact flag, attempts, full-rating and work counters, oracle calls and the independent checks
that ran after the timed interval (unique, solution, symmetric, floor, signs minimal, rating, exact flag and warnings
agree). `--mode=measure` wraps the registered `signs` strategy to add counters only (a function call per sample);
`--mode=diagnose` copies each sample and verifies it afterwards; the wrapper is restored in a `finally`. The unwrapped
control is the manual suite's own CV6 selector, whose Normal p95 (5,209 ms) agrees with the driver's (5,261 / 5,280 ms).
No file was overwritten; a file only exists for a completed process (a `.partial` is removed on completion).

Counts: 4 sources x 240 requests = 960 requests in the manifest, plus 2 diagnosis files of 20, 0 errors, 0 failed checks,
0 incomplete shards. Pool 8 and 4: the files of the manifest as written; pool 16: the two slow cohorts split by literal
seed range and merged exactly once per seed by `aggregate-gt.js` (checked: missing 0, duplicate 0).

## C. GG, GR, GH

| Gate | Evidence |
|---|---|
| Wires G09-G13 | `wire/G09.json` to `G13.json` (compound `e-compound-wire-0`, 83.6 s); check before writing: `logs/wire-check-before-write.txt` (G09, G10, G13 match; G11 1,418 and G12 552 fields differ); `--write`, `--check` in `logs/wire-write.txt`, `logs/wire-check.txt` |
| Analyses G01-G14, recorded after the wire was published | `analysis/G01.json` to `G14.json` (`e-compound-analysis-0`, 98.9 s); `logs/analysis-check-before-write.txt` (G11 167, G12 131 fields; the other twelve match); written and checked |
| 520 hashes, 104 shards, two compounds (74 and 30 items, 392.8 s and 205.6 s) | `hashes/`, `e/shard-runs.jsonl`, `e/compounds.jsonl`; `logs/hash-check-before-write.txt` (30 of 520 changed: all Greater-Than); `--update-hashes`, `--check-hashes`: all 520 unchanged |
| GH | `logs/gh-check.txt`: `ineqChain` and `minMaxForcing` match `help-examples.js`; written nothing |

Plans with a finite projection and its basis for every item (IR12; generic floor 60 s, `elapsed + max(projection,
floor) <= 450`): `e/plan-wire.json`, `e/plan-analysis.json`, `e/plan-hashes.json`; the driver is MS05r6b's `run-shards.cjs`
unchanged (`--evidence=docs/difficulty-v3/evidence/MS05e/e`), one locked invocation per compound, all items within their
projections, no unexpected exit. Changed fixtures: `generator/tests/fixtures/regression.js` (30 hashes),
`replay-wire.js` (G11, G12), `replay-goldens.js` (G11, G12); no other fixture, no `help-examples.js`.

## D. Pins re-derived from the refreshed goldens (Greater-Than only; `pins/explore.json` has the data)

| Test (suite) | Old | New |
|---|---|---|
| steps: marks 13 compact and 14 details jumps over the 14 goldens | 16 details | 14 (G11 has 2 details jumps, was 4) |
| steps: also tells a new hardest technique when the score is flat or falls | G11 position 104, 1,967 to 1,264, W-Wing | 2,862 to 1,084 (-1,778), XY-Wing (weight 650), instead of Nishio |
| steps: names the cause of a move per class | G11 details 110, sign R2C4/R1C4 | G11 details 103, sign R1C5/R1C4 |
| steps: a jump over several moves says where the new technique first appears | G11 111, G12 103 | G11 102 (change 1 of 40), G12 104 (1 of 11) |
| replay: the same end position is a jump in one view and not in the other | G11 111 [119, 957] / [962, 957]; G12 103 [130, 638] / [642, 638]; changes -5, -4 | G11 102 [134, 589] / [596, 589]; G12 104 [132, 592] / [599, 592]; changes -7, -7 |
| replay: 13 compact, 16 details, 18 distinct jump transitions | 16, 18 | 14, 16 |
| replay: labels a new hardest technique at a flat or lower score | G11 104 1,967 to 1,264, wWing / forcingChain | 2,862 to 1,084, xyWing / nishio |
| replay: a cause, a choice and a proof for every jump: 13 compact and 16 details | 16 | 14 |
| replay: frames the details jumps, the four sign jumps of G11 | signs 7, 43, 75, 6 | two sign jumps, signs 67 and 5 |
| player: what a compact step folds | G11 step 2, peak 1,967; G12 step 2, peak 130 | G11 step 5, peak 2,862 with 4 clues restored; G12 step 3, peak 136 |
| player: the sign that causes the jump keeps its removed mark | details step 111, sign 6 | steps 64 and 104, signs 67 and 5 |
| player: frames exactly the jumps one clue or sign causes | 29 jumps | 27 |

Each new value was read from the refreshed data, and every assertion still checks what it checked; no test was weakened,
skipped or deleted. The three Player pins were re-run on their own (5 of 5), and the whole quick sets pass (section E).

## E. Verification

| Check | Result |
|---|---|
| New suite `greater-than-guided` (15 tests) | pass, 0.8 s; first run 14 of 15 (the refusal test assumed a pool of at least 5; fixed to need only 4) |
| New replay cases (`MS05e-T02`, 2 tests) | pass |
| Candidate: Generator quick set through the CI entry, four locked groups on the candidate's final tree | 3,279 of 3,279: `core-shared` 1,143, `steps` 57, `replay` 155, `mega` 111, `own-fast` 1,579, `greater-than-guided` 15, `pipeline` 150, `player` 69; 726.2 s of process time (MS05r6c 648.0 s) |
| Player quick set | 1,683 of 1,683, 31.8 s |
| `generator-suites.sh check` | 3,279 of 3,279 tests in 51 suites, every job inside 30 minutes (projected 630, 1,170, 1,380, 720 s); `selftest` 50 checks, 0 failed |
| Per-level CV6 and I5 (18 cells) | 16 pass; Normal CV6 and Nightmare CV6 fail (timing, S-AV01 and S-AV16), selected total 1 for each cell |
| Normal CV6 before | fail, p95 5,209 ms; I5 pass |
| Format of the changed files | `format-check.cjs` (the check of check-list section 3) over the 463 paths of `git status`: 0 problems (the tool-written evidence files had LF line ends and were normalised to CRLF; no source or document was touched by it) |

**GD applicability (the 18 cells applied to the candidate's final tree; history only).** The 18 cells ran at 07:22-07:37 UTC (`runs.jsonl`) with the manual
fingerprint `e6ba01d4…`; the final tree's is `1fe84a02…`, because the pins of `player`, `steps` and `replay` and the
documents changed afterwards. A `--suite=greater-than` selection neither loads nor reads them. The engine and UI sources
are the same before, during and after the cells. The wire and analysis ledgers (07:05-07:09, `f678cf42…`), the 104 hash
ledgers (07:10-07:21, `13ec3b86…`) and the after-diagnosis (07:38, `9eeefec3…`) all carry the identities of the final
tree. No fixture was written after `hash-update` (07:20:56), and `generator/tests/manual/greater-than.test.js` and
`core/tests/harness.js` are unchanged against HEAD (SA1's read-only check, review `11-review-of-ms05e.md`, IR25). If an
engine, fixture, manual-suite or harness file had changed before the commit, the 18 cells would have been rerun instead;
with the candidate set aside the question is moot.

A first quick run before the pin refresh failed 9 tests of `steps` and `replay` and 3 of `player` (the pins above);
`quick/` holds the final results only, the first runs are in `logs/quick-*.txt` of the same names without `final`.
Non-zero exits among the 98 locked commands (`commands.md`): `gd-before-normal-CV6`, `gd-final-normal-CV6` and
`gd-final-nightmare-CV6` (the recorded CV6 failures); `focused-guided` (the first run of the new suite, one failing test,
fixed); `quick-shared-small`, `pins-steps-replay` and `quick-replay-player` (the pin failures above, fixed); `pins-explore`
(a script error at 0.3 s, fixed). `driver-smoke-diagnose` and `scratch-diagnosis` are two smoke runs of the driver (2 and 4
seeds); their output was deleted and is not evidence.

## F. Unlocked commands (IR07: short, no puzzle generated)

`--list-tests` registrations (one per GD cell), `--merge ... --check` of the three E ledgers before writing, the aggregation
and plan scripts (no generation), `prove-format-only.cjs`, `generator-suites.sh check` and `selftest` (registration only,
4.0 s and 0.25 s). The Windows `bash` is WSL's stub without a distribution; Git's `bash.exe` ran them. Everything that
generates a puzzle, the quick shards and the GH check ran under the lock; the longest lock wait was 0.14 s (Pentomino
paused), and each run began at least 15 s after the previous release.

## G. Files

Candidate files (the 12 tracked ones were restored and the new suite deleted, see section I). Created: `generator/tests/suites/greater-than-guided.test.js`, `docs/difficulty-v3/cv6-guided-sign-dig-2026-11-14.md`,
this folder, `generator/tests/artifacts/difficulty-v3/MS05e/` (six scripts). Changed: `generator/js/variants/greater-than.js`,
`generator/tests.html`, `.github/scripts/generator-quick.json`, `generator/tests/suites/replay.test.js`, `steps.test.js`,
`player.test.js`, `generator/tests/fixtures/regression.js`, `replay-wire.js`, `replay-goldens.js`, `generator/design.md`,
`DEVELOPERGUIDE.md`, `DEVELOPERGUIDE.vn.md`, `docs/difficulty-v3/notes.md`. No user guide changed (no sentence of it became
false); no engine file other than `greater-than.js`, no pack file, log, clarification, report or analyst folder.

## H. Items and findings

See section 7 of the report. After CV6-05: S-AV01 carried open under Q2(a) (5,209 ms against 1,400 ms; 10.6 s p95 on seeds
7000-7039); S-AV16 and S-AV17 withdrawn as current-source items (the candidate's observations kept as history); S-AV08 back to
648.0 s; S-AV02 to S-AV15 and MS05r6a-COV01 carried unchanged; Nightmare CV6 passes at 19,192 ms of 20,000 (a 4 % margin,
noted for MS07e); decision D1 answered (Q1(b) withdraw the pool, Q2(a) keep the contracts); F01 and F02 moot. The CI shard
`greater-than-guided` and the raised bounds of `own-fast` and `pipeline` were the candidate's (R6C-I05) and are gone with the
restore.

Documentation corrections after SA1's review (`docs/difficulty-v3/claude-opus-5.5/11-review-of-ms05e.md`, section 5): IR23 to
IR28 in the report, in this index and in the MS05e section of `docs/difficulty-v3/notes.md`, text only; nothing was re-run,
and no source, fixture, pin, suite, CI manifest or raw record changed.

## I. Disposition: set aside (CV6-05) — candidate patch, restore and identity

**Decision.** The plan author's answer CV6-05 (`docs/difficulty-v3/clarifications.md`, under S-OD6): Q1(b), withdraw the pool;
Q2(a), keep the contracts and let final qualification decide whether Normal is offered. MS05e closes as "set aside", not as an
accepted repair. The restore followed SA1's review (`11-review-of-ms05e.md`), section 4, option (ii).

**The candidate patch, `candidate-pool-4.patch`** (in this folder; outside every fingerprint).
- *Covers 13 files:* `generator/js/variants/greater-than.js`, the new `generator/tests/suites/greater-than-guided.test.js`,
  `generator/tests.html`, `.github/scripts/generator-quick.json`, `generator/tests/fixtures/regression.js`,
  `replay-wire.js` and `replay-goldens.js`, the pins in `generator/tests/suites/replay.test.js`, `steps.test.js` and
  `player.test.js`, `generator/design.md`, `DEVELOPERGUIDE.md` and `DEVELOPERGUIDE.vn.md`.
- *How it was made:* by the orchestrator, a zero-context diff with full blob hashes, from the snapshot `c0e4954` of the
  reviewed candidate against `f7be90f`; it is stored with CRLF line ends in the working tree.
- *Rebuild:* `git show <commit>:docs/difficulty-v3/evidence/MS05e/candidate-pool-4.patch | git apply --unidiff-zero` on
  `f7be90f`, where `<commit>` is the commit that carries the patch.
- *Rebuild proof (no run):* the command above, applied on `f7be90f` in a temporary index, reproduced the candidate exactly:
  an identical tree for all 13 paths.

**The restore.** All 12 tracked candidate files were restored byte for byte from `f7be90f` (the 13 paths above except the new
suite), and `generator/tests/suites/greater-than-guided.test.js` was deleted (it lies inside the quick fingerprint).

**The identity proof (step 4, no run).**
- `git diff --quiet HEAD -- generator core player DEVELOPERGUIDE.md DEVELOPERGUIDE.vn.md AGENTS.md .github` exits 0, with
  `HEAD` = `f7be90f`.
- No untracked file is left in a fingerprinted folder; the only untracked path under `generator/` is
  `generator/tests/artifacts/difficulty-v3/MS05e/` (the scratch scripts), which is outside every fingerprint.
- `generator/js/variants/greater-than.js` is git blob `cbab64b8`, equal to `f7be90f`'s (it is the base blob of that file in
  the patch).

**What therefore applies to the restored source by identity** (nothing is re-run, none is relabelled):
- MS05r6c's final quick results, through its CI entry: the Generator quick set 3,262 of 3,262 tests in 50 suites and 7
  disjoint shards (648.0 s of process time), the Player quick set 1,683 of 1,683, reconciled, `6b40d218…` and `547e4a4e…`,
  and its check against the real tree (3,262 of 3,262 keys once). The candidate's 3,279 tests in 51 suites (726.2 s) were
  the baseline plus the 15 tests of `greater-than-guided` and the two replay cases.
- MS05r6b's E records (5 wires, 14 analyses, 520 keys, current) and its GD records (classic9 GD; S-AV07, S-AV14, S-AV15).
- This task's records of the unchanged source: `before/` (the diagnosis and the ten timing files, 240 requests) and
  `gd/before/` (Normal CV6 5,209 ms, I5 pass). They record `f7be90f` clean, which the restored tree equals.

**What is history only** (measured on the candidate; it applies to nothing that is committed): the pool-4, pool-8 and
pool-16 files, `after/diagnosis.*`, `comparison.*`, `gd/final/` (the 18 cells, Normal CV6 17,014 ms, Nightmare CV6
40,396 ms), the candidate's E (`wire/`, `analysis/`, `hashes/`, `e/`: 30 changed hashes, G11 and G12), `pins/`, `quick/`
(3,279 of 3,279 in 726.2 s), the format check, and the candidate fixtures and pins. The raw files stay as they are.
