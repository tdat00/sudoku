# MS05r4 evidence: the R5 selection of the shallow-search allowance, the closure diagnostics and the original-limit preflights

Step evidence of the S-OD2 recovery (CV6-02 (a)); no acceptance and no commit. Authority: S-OD2, absorbed MS05d, R5 and
SA2-Q-S12, unchanged. The human-readable result is [../../shallow-cap-2026-11-13.md](../../shallow-cap-2026-11-13.md).
Working tree: the MS05b1 requiredness activation, MS05r1 tooling, MS05r2 consumers and MS05r3 instrumentation, plus this
task; `HEAD` `f788e02`, dirty. Node v26.13.0, Windows x64, AMD EPYC 7763 (16 logical CPUs), one process at a time, no
`--jobs`. Every sudoku command went through the verbatim helper `Invoke-Dv3Node.ps1` (a copy of the one of MS05r3 and of
`tasks/difficulty-v3/check-list.md`), started by the wrapper `generator/tests/artifacts/difficulty-v3/MS05r4/Run-Dv3Logged.ps1`
(the same helper, with the console redirected to a transcript and one JSON line per command in `runs.jsonl`: exit code,
node seconds, wall seconds and the lock wait, the wall minus the node seconds). Paths below are relative to the repository
root; commands run from `generator/`.

## Result

R5 selects **256**. The one production edit is the literal of `generator/js/engine/digger.js` line 653,
`const SHALLOW_SEARCH_DEFAULT = Infinity;` to `= 256;`. The original-limit preflights **fail for the two mega Nightmare
groups** (G13 passes): that is the S-OD2 owner stop. Nothing was relaxed or retried, and r5, b3, r6a and r6b are not
enabled by this evidence.

## Identities

| Item | Value |
|---|---|
| Engine source hash of every measurement (63 `SOURCE_FILES`, the construction of `tests/soak.js`) | `19afa6eea0af8042cafd10cca6e22587b7238233b89c8e6f2ac46192086f4a2e` (= MS05r3's; in all 28 ledgers and 12 diagnostic records), default `Infinity` |
| Engine source hash after the default literal | `9a833d9376381c6f9e2df4c5a79aba981bbd8a3dafce9e572ff2641bd61759ce` (in `preflight/G13.json` and the sidecars; reverting the literal in memory gives the first hash exactly) |
| `generator/js/engine/digger.js` (LF-normalised SHA-256) | before `26e8c9d9be83c987ed53f0385fce7d992e92ea219610e431d3cce8cc8bde9c69`, after `2690da26171a6f3de8e4e6ee375f137037aea21f3a02e5ccd1904b4ff0dd02a9` |
| Exact diff of the default | `digger.js:653` `-  const SHALLOW_SEARCH_DEFAULT = Infinity;` `+  const SHALLOW_SEARCH_DEFAULT = 256;` (one line, CRLF kept) |
| Soak tool hash (`meta.toolHash`: `tests/soak.js`, `perf-helper.js`, `difficulty-diagnostics.js`) | `da295e75f43dcd8cd5b66e0f566892b14036ea2ce9297b29a848abcb9c98bc72` in all 28 ledgers; `tests/soak.js` `9c4a723866b88d18…` |
| Recovery driver tool hash | `60087ccda4afe35ec0df7d98d51a61a3ef68c94d99cb931e27eeed4d0e1df5ed` in the 12 records (= MS05r3's) |
| Manifest | `manifest.json`, `manifestHash` `d881506a5bdb105552e688d2134d8f9f59d312265e561bdd2bfd6eecefc98026` (declared before any measurement: 288 selecting requests with their tags and seeds, 12 diagnostics); `configHash` `ce509e96a798eaa94ddf61663157ef7b109e5f693ea17c603bb0e92ba61f9a15` in `selection.json` |
| Aggregator `select-cap.cjs` | `4319abcd86504bfa61091c51ef8b45c0fd80eab561aba31aca049066f4cb3e4b`; `select-cap.selftest.cjs` `2fd54c4ecca00b20984dafa7dafa5ac6620c770a6d45c7cb6f9a87450ef9db15`; `g13-closure.cjs` `eedeff26d9578ba3c1e3ed2d1d85683e52f498507829791221c8698358b538c4`; `Run-Dv3Logged.ps1` `1085fe8b2b579e7394697432a7302e15ff4d4276406b2ab01784ee74c4e5bbfd`; `Invoke-Dv3Node.ps1` `4880b3205aedec82f359ab2002dbce5cbbc06bd269ee1a38aeaa912b977d6e02` (LF-normalised) |

## A. The 12 non-selecting diagnostics

`tests\difficulty-recovery.js --mode=diagnostic --case=<case> --shallow-cap=<setting> --json=..\docs\difficulty-v3\evidence\MS05r4\diagnostic\<setting>\<case>.json`,
one process each, normal attempts (8), the 500 s ceiling of the driver. All 12 exit 0, `outcome: ok`, `complete: true`, no
instrumentation problem (read from the records, not only from the exit codes). The table is in the report; per run:

| Case | none | 256 | 128 | 64 |
|---|---|---|---|---|
| G13 | 220.9 s | 105.1 s | 87.2 s | 80.5 s |
| mega12 Nightmare | 65.6 s | 47.6 s | 44.3 s | 39.9 s |
| mega16 Nightmare | 389.2 s | 310.7 s | 297.5 s | 270.9 s |

(node seconds of the command; lock wait 0 for all twelve.)

## B. The 288 selecting requests

`tests\soak.js --variant=<v> --level=<l> [--from=<k> --count=<n> --total-count=12 | --count=12] --seed=20260101 --no-gate
--shallow-cap=<setting> --json=..\docs\difficulty-v3\evidence\MS05r4\selection\<setting>\<file>.json`, jobs 1. Whole cells
(12 requests) for classic9 Normal, Master and Nightmare and Killer Hard and Expert; Jigsaw 9 Expert in two absolute-index
shards, requests 0 to 2 and 3 to 11 (the first shard at `none` was a timing probe and is part of the plan; the same two
shards at all four settings). 28 ledgers, all complete, `PASS`, 0 request errors, 0 invariant violations, 0 check errors,
0 reference or final-path errors, 0 work unavailable. All exit 0. Node seconds per cell:

| Cell | none | 256 | 128 | 64 |
|---|---|---|---|---|
| classic9 Normal | 3.5 s | 3.5 s | 3.5 s | 3.4 s |
| classic9 Master | 1.5 s | 1.5 s | 1.4 s | 1.4 s |
| classic9 Nightmare | 74.0 s | 66.6 s | 59.9 s | 49.9 s |
| Killer Hard | 74.0 s | 73.4 s | 73.3 s | 71.7 s |
| Killer Expert | 149.3 s | 150.8 s | 149.6 s | 149.0 s |
| Jigsaw 9 Expert (0-2, 3-11) | 3.5 + 9.3 s | 3.0 + 8.0 s | 2.1 + 5.8 s | 1.6 + 4.4 s |

### The selection

`node tests\artifacts\difficulty-v3\MS05r4\select-cap.cjs --manifest=..\docs\difficulty-v3\evidence\MS05r4\manifest.json
--selection=..\docs\difficulty-v3\evidence\MS05r4\selection --diagnostic=..\docs\difficulty-v3\evidence\MS05r4\diagnostic
--out=..\docs\difficulty-v3\evidence\MS05r4\selection.json` (exit 0, status `selected`, chosen `256`, eligible `[256]`).
It merges each (setting, cell) with `mergeShards` (indexes 0 to 11 once, tags, same source, tool, Node, seed base and
setting), checks every row's tag and pipeline seed against the manifest, every ledger's checks, and one identity across
the 28 ledgers and the manifest's frozen hashes, and computes the hits (`generationExact === true`) and the upper median
(sorted index 6) of `fullRatings` from the raw rows. A first run on the partial evidence (three Killer Expert ledgers
still missing) was refused as `blocked` with exactly those three problems (`select-dry-run` in `runs.jsonl`; not
evidence). The table of the 24 cells, the comparisons and the 28 ledger hashes are in `selection.json`.

| Check of the aggregator | Result |
|---|---|
| `select-cap.selftest.cjs` (18 cases on fake rows: the smallest eligible setting wins; a one-hit loss disqualifies 64 and 128 wins; a gain elsewhere does not excuse a loss; ties and hits without a median reduction select none; the median is the sorted index 6; error rows stay in the 12; unknown work, a work mismatch, a duplicate, a gap, mixed source/tool/setting/seed, an invariant violation, an altered manifest block; shards equal the whole cell from rows; the CLI: declare, no overwrite, analyse, blocked, usage) | 18 of 18, exit 0, 1.1 s and 1.0 s (run before and after the two half-tests were added, the second time on the final file) |
| Mutation check (scratch script, deleted): 11 mutants of `select-cap.cjs` (`<=` for `<` on hits, no strict reduction needed, median index, largest instead of smallest, work check ignored, identity not compared, seeds not compared, invariants not read, error rows dropped, setting folder not checked, allowance value not checked) | all 11 caught (a first run left one alive: the redundant allowance-value condition; two half-tests were added to the self-test, then 11 of 11) |

## C. Focused checks at the selected default (no allowance override)

All with `-AllowExit1` through the wrapper; transcripts verbatim in `focused/`; `default-pin-manifest.json` has the
classified result.

| Selector | Exit | Result | Node s | Lock wait |
|---|---:|---|---:|---:|
| `--suite=digger,difficulty-diagnostics,difficulty-floor,worker,cache,recovery-profile --verbose` | 0 | 463 of 463 (cache 101, difficulty-diagnostics 80, difficulty-floor 48, digger 64, recovery-profile 27, worker 143) | 90.7 | 50 |
| `--suite=pipeline --filter=MS05b1- --verbose` | 0 | 30 of 30 | 1.7 | 105 |
| `--suite=pipeline --filter=recovery: shallow allowance --verbose` | 0 | 16 of 16 | 1.8 | 0 |
| `--suite=help,ui-contract` (after the guide edits; not a task command) | 0 | 30 + 67 of 97 | 4.4 | 25 |

No failure, so there is no returned premise (r3) and no genuine pin (r6a): `pins: []`, `returnedPremises: []`.

## D. Original-limit preflights at the selected default

| Command | Exit | Result | Node s | Lock wait |
|---|---:|---|---:|---:|
| `node tests\artifacts\difficulty-v3\MS05r4\g13-closure.cjs --json=..\docs\difficulty-v3\evidence\MS05r4\preflight\G13.json` | 0 | `outcome: ok` in 104.712 s of the 120 s guard; 8 attempts, score 1,637, exact false, required false, warnings `difficulty.approximate`, `difficulty.shallow`; the copied work has 8 attempts with `shallowLimit` 256 and `capHit` `shallow` | 105.2 | 5 |
| `--suite=mega --filter="> mega puzzles > mega12 nightmare:" --verbose` | 1 | 1 passed, 1 failed: seed 1 took 48,202 ms against `timeLimit(3000)` = 6,000 ms (factor 2); the CV5 test passed (137.7 s) | 186.1 | 45 |
| `--suite=mega --filter="> mega puzzles > mega16 nightmare:" --verbose` | 1 | 0 passed, 2 failed: `budget.exceeded` at the 60,000 ms guard in both | 120.2 | 35 |

`preflight/mega12-nightmare.txt` and `mega16-nightmare.txt` are the complete console outputs (the only edit: the absolute
repository root in the stack frames is `<repo>`), with sidecars `.json` (command, exit, durations, source, runner, harness
and suite hashes, default 256, Node, factor 2 and the limits). The factor comes from `SG.test.TIME_FACTOR` of
`core/tests/harness.js`: 2, since `CI` and `SG_TIME_FACTOR` are not set. A fallback is not exempted, and a failed seed loop
is not reported as run. No `--list-tests`, `--exact` or `--results` were used.

## Machine time and lock waits

54 recorded commands (`runs.jsonl`), node time 3,690.0 s (61.5 min), wall 4,758.3 s, lock wait 1,060 s in all.

| Group | Commands | Node seconds | Lock wait |
|---|---:|---:|---:|
| none (3 diagnostics, 7 selecting) | 10 | 990.8 | 35 s |
| 256 | 10 | 770.1 | 135 s |
| 128 | 10 | 724.6 | 270 s |
| 64 | 10 | 672.7 | 285 s |
| focused checks | 3 | 94.1 | 155 s |
| preflights | 3 | 411.6 | 85 s |
| tooling (declare, aggregator, self-tests, mutation checks, help) | 8 | 26.0 | 95 s |

The first 26 commands (the 12 diagnostics, the tooling between them and the classic9 cells) had no lock wait. Pentomino's
timing runs then interleaved: lock waits of 10 s to 165 s (largest: Jigsaw 9 Expert 3-11 at 64, 165 s; Killer Expert at
128, 150 s). Nothing overlapped: the slot was held by one repository at a time, and every run after the first of a batch
followed a 15 s pause.

## Spec gaps, discrepancies and incidents

1. The wrapper `Run-Dv3Logged.ps1`, `runs.jsonl` and the scratch logs are the developer's way to keep transcripts and
   lock waits without flooding the review; the helper itself is verbatim and unchanged. The scratch logs
   (`generator/tests/artifacts/difficulty-v3/MS05r4/scratch/`, the soak console outputs) were deleted at the end: the
   ledgers hold the data.
2. The mega transcripts are verbatim except for `<repo>` replacing the absolute path in the stack frames, because the file
   rules forbid absolute paths. The preflights ran with `-AllowExit1` so that the failing exit 1 would still give the
   transcript and the run record; the exit codes recorded are the real ones (1).
3. `default-pin-manifest.json` lists the two mega failures under `blockers` (the task's schema has the field; it says
   nothing about the preflights).
4. The R5 result rests on one cell: 256 lowers only the median of classic9 Nightmare (1,345 against 1,417, hits 2 and 2).
   The rule is satisfied as written; 64 and 128 are excluded by the hit loss in the same cell.
5. G13 passes with 87 % of the guard, in a run that had 5 s of lock wait before it; a slower machine state could change
   that. The 12 diagnostic and preflight times of G13 at 256 (105.1 s and 104.7 s) agree.
6. The preflight G13 record derives `required` from `SG.difficulty.requiredOf` after the timed call; the timed call is the
   one `SG.pipeline.run` of the task. No puzzle is saved (a hash of the givens and solution only).
7. Not run, by the task's scope: the full `pipeline`, `mega`, `steps`, `replay` and `player` suites, GG (the 520 hashes),
   GR, the manual corpora. The finite default changes which puzzle some requests return; whether any other pinned puzzle,
   trace or hash differs is MS05r6a's final-source E and MS05r6b's complete quick run to find out.
8. The 15 s pause before the first command of a batch was not taken for the diagnostic batches at none, 64 and 128 (each
   started right after the previous command ended, with a lock wait of 0 for all its runs); it was taken before every
   later batch. The pause between the runs of a batch was always taken.
