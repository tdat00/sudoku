# MS07d evidence — complete, checked qualification-shard merger

Developer: claude-sonnet-5.5. Start 2026-11-15 08:40:34 (+07:00); first evidence 09:52; review round 2 (pack author's finding on
the pair-atomic output write) 10:07 to about 10:45, section 10. Branch `rating-v3`, HEAD `1f27ef7`
plus the uncommitted MS07d changes listed in section 9. Nothing was staged, committed, stashed or reset; no ref was touched.
No real qualification, no generation and no GQ ran: every record below is a synthetic unit vector, and the merge mode
generates nothing.

## 1. Identity and environment

| Item | Value |
|---|---|
| Machine | AMD EPYC 7763, 16 logical processors, 64 GiB, Windows x64, Node v26.13.0, time factor 2 |
| Generator quick fingerprint (final tree) | `f7563e283712…` (all eight Generator shard results) |
| Player quick fingerprint (final tree) | `36e9bd60c9bc…` |
| Engine sources | no file under `generator/js` or `core/js` changed (the `engine.sources` hash of a shard is unchanged by this task) |
| Lock | every command over about 10 s ran through `Invoke-Dv3Node` (`invoke-dv3node.ps1` here is the verbatim helper), one command per lock, at least 15 s between two locked commands, at most 540 s per command. No stale or foreign lock was met; the longest wait was about 5 s (once, one poll of the helper), far from the 20 minutes after which a wait is reported. |
| Unlocked commands | only no-generation commands: `node --check`, the format check, `--help`/usage and error exits of the CLI, `node tests/qualify.js --merge=<missing or empty folder>` (exit 1, no engine run beyond the 45 ms load), the 4 s registration-only CI check, one 1 s fake-worker measurement script |

## 2. Commands, exit codes, counts and seconds

Final tree (after the last edit of any fingerprinted file). Process seconds are the runner's own; the lock wait is in the
last column.

| Command (from `generator/` unless noted) | Exit | Result | Seconds | Lock wait |
|---|---:|---|---:|---:|
| `node ..\.github\scripts\generator-quick.js run shared-small --results-dir=..\docs\difficulty-v3\evidence\MS07d\quick` | 0 | core-shared 1,210 + steps 57 + replay 154 + mega 108 = 1,529 / 1,529 | 70.3 (27.0 + 16.5 + 15.3 + 10.1) | 0 |
| `... run own-suites ...` | 0 | own-fast 1,678 + digger-target 75 = 1,753 / 1,753 (qualification-records 46) | 168.0 (165.2 + 1.8) | 0 |
| `... run pipeline ...` | 0 | pipeline 154 / 154 | 309.5 (309.1) | 0 |
| `... run replay-player ...` | 0 | player (Generator suite) 69 / 69 | 134.8 (134.4) | 0 |
| `node tests\node-runner.js --results=..\docs\difficulty-v3\evidence\MS07d\quick\player-quick.json` (from `player/`) | 0 | Player quick 1,750 / 1,750, complete, source stable | 33.4 | 0 |
| `bash .github/scripts/generator-suites.sh check` (Git bash, registration only) | 0 | 3,505 of 3,505 Generator tests in 53 suites, Player 1,750 in 30; every job inside its limit | 4 | n/a |
| `node tests\node-runner.js --suite=qualification-records,help,ui-contract --verbose` (`focused-final.txt`) | 0 | 143 / 143 (46 + 30 + 67) | 6.8 | 0 |
| `node tests\node-runner.js --suite=difficulty --filter=qualification:` (`gd-fake-qualification.txt`) | 0 | 6 / 6, GD-fake only, jobs 1 / no `--jobs` (expected 1-15 s) | 3.6 | 0 |
| `node tests\artifacts\difficulty-v3\MS07d\round2-workers.js` (fake workers, no generation) | 0 | see section 6 | under 1 | n/a |

Totals: the Generator quick set is **3,505 / 3,505** (3,459 + the 46 new tests), sum of the shard process seconds **679.4 s**
(MS07c: 684.3 s; the new suite costs about 2 s, the rest is run-to-run noise: pipeline 310.8 to 309.1 s). The Player quick set
is **1,750 / 1,750**, unchanged. Every `--results` file has `complete: true`, `failed: 0`, `skipped: 0`,
`sourceStable: true`. The first-round evidence of the same commands (3,503 tests, before the output-write fix) is kept in
`superseded-round1/` and is not evidence of the final tree.

Development runs of `--suite=qualification-records` (focused-1 to focused-8, 0.5 to 2.3 s each): 24/31, then 29/31, then 31/31
passed, then 42, 43 and 44 tests as the Node-only parts were added. The first failures were my own expectations (files sort by
name, a derived summary reason came first, two regular expressions, a helper call that took the attempts from the cell it checked)
and two helper defects that the vectors found: a machine difference was reported twice, and a summary reason `incomplete` ended the
checks before the round check. The 46/46 run is in `focused-final.txt`.

## 3. The merge command and its contract

```text
node tests/qualify.js --merge=<folder> --jobs=4 [--json=<file>] [--markdown=<file>] [--quiet]
```

- Reads every `*.json` of the folder (a subfolder, `*.md`, `*.partial` are not entered or read). Every such file must be a
  valid shard. Generates nothing; loads the engine only for what the tree says (`SG.variants`, `SG.difficulty`,
  `SG.digger.defaultMaxAttempts`) and hashes files.
- `--jobs=4` is required (usage error 2 without it); `--variant`, `--level`, `--probe`, `--no-early-stop` and `--child` cannot be
  combined with `--merge` (exit 2). Exit 0: valid, outputs written. Exit 1: rejected (problems on stderr, at most 40 lines, nothing
  written, existing outputs byte for byte) or a write failure (both outputs or none, see the next point). Exit 2: usage.
- No output is a default. An output inside the shard folder, `--json` and `--markdown` naming one file, and the live table
  `docs/difficulty-rating/qualification.md` (also in another letter case) are refused before anything is read.
- Outputs are UTF-8 without BOM, CRLF, a final line end, one line per field, shard and request; written to `<file>.partial`
  after the whole validation. The same text routine writes the shards of a generation run now.
- **Pair-atomic write** (`publish`, round 2): before the first rename the bytes of every existing target are kept (or the fact that
  there was none). If a rename fails, every target already replaced is written back from its copy (or removed when it did not
  exist), every `.partial` is removed, and the run exits 1 with `qualify: the merge is valid but its files could not be written:
  <cause>; the N output(s) already replaced were put back as they were`; if even a restore fails the message is `...; THE OUTPUTS
  COULD NOT BE PUT BACK: <files>`. A failure of a first rename or of a write of a partial changes no target and the message is the
  cause alone. The generation run uses the same routine for `--json` and `--markdown`.

Metadata written by every new shard (`--json`), in this order after the existing `protocol`, `seedBase`, `machine`, `engine`:
`qualifierHash` (SHA-256 hex of the bytes of `qualify.js`, a NUL, the bytes of `tests/fixtures/qualification-records.js`, a NUL),
`acceptance: "canonical-required-tier"`, `ratingVersion` (the engine's `SG.difficulty.RATING_VERSION`, 2 today: the development
version, never labelled a released v3 result), `probe` (0 or N), `earlyStop`, `guardMs` (120000), `attemptPolicy`
(`{ function: "SG.digger.defaultMaxAttempts", explicitMaxAttempts: false, sources: { js/engine/digger.js, js/engine/pipeline.js,
js/variants/registry.js: SHA-256 } }`), then `started`, `finished`, `seconds`; each cell has `attempts` between `budget` and `summary`:
**the maximum of attempts configured for its board** (the size default, `defaultMaxAttempts(cellCountOf(def))`: 8 up to 81 cells,
4 up to 144, 2 above), **not the attempts a request used**, which a shard does not record.
Neither the worker nor the merger names `maxAttempts`; a cell whose `attempts` differs from its board's default is rejected.

Merged record (`--json`): `protocol`, `seedBase`, `machine`, `engine` `{ sources, commit, commits, dirty }`, `qualifierHash`,
`acceptance`, `ratingVersion`, `probe` 0, `earlyStop`, `guardMs`, `attemptPolicy`, `matrix` `{ variants (15), levels (9), cells 135 }`,
`started`/`finished` (first start, last end), **`wallSpanSeconds`** (first start to last end), **`shardSeconds`** (the shards'
`seconds` added up), `shards` (file, started, finished, seconds, engine, cell keys of each shard), `totals` (cells, requests,
hits, errors, approximate, invalid, offered, hidden, stopped), `cells` (135 in matrix order, every request as written),
`support` (derived from the verdicts, in level order). `engine.dirty` is true if any shard was dirty (a shard run after the first
sees the untracked evidence files, so it is informational); `engine.commit` is the one common commit or null, `engine.commits`
lists them; the commit and the dirty flag are provenance, kept per shard and never compared. The identity is the hashes.

Validation rules (every problem of every shard is collected, nothing is written unless there is none):

1. Each shard: protocol text, seed base 20260601, `qualifierHash` present and equal to the current tool's, current `engine.sources`,
   `ratingVersion`, `attemptPolicy`, `acceptance`, `guardMs`, `probe` 0, boolean `earlyStop`, machine (CPU, platform, Node, jobs 4,
   numbers), ISO `started`/`finished`/`seconds` consistent within 1 s, `support` equal to the support derived from its cells,
   and not a merged record. A shard from before MS07d has no `qualifierHash` and is refused.
2. Across shards: one machine and Node (jobs is checked against 4 on its own), one `earlyStop`, no overlap in time (the qualifier is
   never run twice at once).
3. Matrix: the engine's registry is the 15 variants x 9 levels of checklist Q; every cell exactly once; unknown, foreign, duplicate
   or missing cells named (the first 12 missing keys).
4. Cell: board size, budget (2/10/30 s) and `attempts` equal the board's; requests have the cell key, a whole index 0..99 once,
   the seed `FNV-1a(variant/level/index)` on base 20260601, finite `ms` of at least 0, a boolean `hit`, and an outcome: an `error` text
   with `hit: false`, or `valid`, `solved`, `approximate`, `exact` booleans with the `hit` that `hitOf` gives; any other field is kept.
5. Rounds: a verdict needs exactly the indexes 0..39 or 0..99; 30 to 35 hits of 40 without the second round are rejected; any
   second-round index needs all 40 first outcomes with 30 to 35 hits (and, with early stop, at most 5 slow ones among them).
6. Stops (early stop on): `stopped` is null, `misses` or `time`. With early stop on a level without a stop has at most 10 misses
   and 5 slow requests; a stopped level shows 11 misses (or 6 slow requests) at the stop and at most `jobs - 1` = 3 more, a
   first-round stop shows the indexes 0..n-1, a second-round stop need not (dispatched from 99 down). With `--no-early-stop`
   no stop is allowed. An error or a timeout is a recorded miss; a failed run publishes no shard.
7. Summary: recomputed with the same `decide` and equal in every field; no extra field.

## 4. Synthetic vectors (unit data, not evidence) — suite `qualification-records`, 46 tests

| Vector of the test plan | Test | Result |
|---|---|---|
| 36/40 fast offered | one cell: accepts 36 hits of 40 | valid, `offered`, n 40 |
| 35/40 incomplete expansion | one cell: refuses 35 hits of 40 without the second round | rejected (1 problem; also 70 and 39 outcomes) |
| 90/100 fast offered | one cell: accepts 90 hits of 100 | valid, `offered`, n 100 |
| 89/100 hidden | same test | valid hidden without early stop; rejected with early stop on (11 misses, no stop) |
| 11 misses early hidden | one cell: accepts an early hidden stop at 11 misses | valid (n 14); 10 misses and 15 misses rejected |
| sixth slow request early hidden | one cell: accepts ... the sixth request over the budget | valid (n 9); 5 slow, 10 slow and 14 misses rejected |
| invalid stopped reason | one cell: refuses a stop reason that is not misses or time | `budget`, `incomplete`, `""`, 0, true rejected; stop with early stop off rejected |
| duplicate indexes | one cell: refuses a duplicated index ... | rejected (`index 7 appears twice`) |
| wrong derived seed | same test (soak's base 20260101 used) | rejected with the derived value |
| jobs 2 mixed with 4 | merge: refuses jobs 2 mixed with 4 | 1 problem; 15 shards at 2 give 15; `--jobs=2` refused |
| missing one of 135 | merge: ... one cell of 135 missing | `missing 1 of 135 cells: wordoku/hell2` |
| byte-unchanged output on a rejected merge | CLI: writes nothing and leaves the existing outputs byte for byte; and the real process | outputs equal `OLD RECORD`/`OLD TABLE`, no write call at all, no `.partial`; exit 1 |
| both outputs or none (round 2) | CLI: puts the first output back when the second cannot be put in place; says so when an output cannot be put back | rename of the second output refused: both files byte for byte as before (existing, absent, or mixed), no `.partial`, exit 1, message `...; the 1 output(s) already replaced were put back as they were`; first rename refused: no target changed; restore refused: `THE OUTPUTS COULD NOT BE PUT BACK: <file>` |

Further vectors: second-round stop with non-contiguous indexes (valid, n 44) and ascending (valid); a second round without all 40 first
outcomes, with 36 or 29 first hits, or with 6 slow first-round requests (rejected); a first-round stop with spread indexes
(rejected); negative, NaN, infinite, null or text `ms`; a request with no outcome; a hit that its outcome does not give (five
variants); a hit with an error; ten tampered summary fields; `attempts` 8 on mega16 (the explicit-eight shape) and wrong budget/size;
merge order independence and request fields kept (`stats`); a different source, qualifier, rating version, attempt policy, protocol,
seed base, acceptance, guard, probe or a merged record as a shard (12 variants); a probe cell; another CPU, Node or early-stop setting;
an overlap in time; a wrong `seconds`; a foreign, duplicate or unreadable file; a registry that is not the manifest; every problem of
three bad shards reported; different commits kept per shard; an invalid puzzle reported on stderr and in the totals; the text
(CRLF, no BOM, no trailing space, final line end; JSON equal to the record); the options and their conflicts; both outputs or none; the
live table, the shard folder and a repeated file refused; the unchanged exports of `qualify.js` and the identity functions.

Scheduler fidelity (the real `parent` of `qualify.js` on fake workers that answer in a pseudo-random order): 7 scenarios x jobs 1/2/4 x
2 answering orders, and 3 scenarios without early stop, **45 runs; every level the scheduler wrote passed `checkCell`**, and the
runs covered complete first and second rounds, `misses` stops in both rounds, `time` stops in both rounds, and hidden unstopped levels.
Real processes (5 spawns on a folder of its own `.scratch-qualification-records/<unique>/`, removed afterwards): exit 0 with the exact
text of the pure merge, exit 1 with untouched outputs, exit 2 for a conflict, a missing `--jobs` and the live table.

Mutation checks (one edit, one locked run, restored; both files restored byte for byte, SHA-256 compared):

| Mutation | Result |
|---|---|
| M1 the in-flight allowance `jobs - 1` set to 0 | 3 tests fail, among them the real-scheduler test (a stopped level with 13 misses at jobs 4) |
| M2 the first-round prefix check removed | 1 test fails |
| M3 `qualifierHash` no longer compared | 2 tests fail |
| M4 a hit no longer checked against its own outcome | 1 test fails |
| M5 `qualify.js` writes an output on a rejected merge | 3 tests fail (fake file system, byte comparison, real process) |
| M6 (round 2) the restore of the already replaced outputs removed from `publish` | 2 tests fail (the first output keeps the new record; the "could not be put back" message is not produced) |

An earlier M6 run reported 46/46 because the restoring edit ran in parallel with it (tool batching) and the run was therefore
unmutated; it was discarded and the mutation was run alone (`mutation line 567`, `[].forEach`), then restored and checked by the
unmutated 46/46 runs that followed.

## 5. Documents

`generator/design.md` (§12.1 tree, §15.1/15.2 counts 37/53/61 and 3,505, the fixture and suite rows, the `qualify.js` bullet, new
§15.4 paragraphs "Qualification, `tests/qualify.js`, and its merge"), `DEVELOPERGUIDE.md` and `DEVELOPERGUIDE.vn.md` (tree,
counts, the qualification bullet, in step), `generator/tests.html` (fixture and suite lists), `.github/scripts/generator-quick.json`
(see section 8). No user guide change (no user-visible behaviour).

## 6. Named items

**New: S-AV27 — the second round of a level runs on one worker.** Origin: reading `parent`/`next` of `qualify.js` for the stop proof,
confirmed by `round2-workers.txt` (`generator/tests/artifacts/difficulty-v3/MS07d/round2-workers.js`: the real scheduler, one fake
classic4/hard level that expands, completion order random, no generation). In an invocation of one level, a worker that finds the queue
empty at the end of the first round is sent `exit`, so the 60 second-round requests run on the single worker that finished the 40th
result: `jobs 1: max in flight 1`, `jobs 2: 1`, `jobs 4: 1`, `jobs 8: 1` in the second round (first round: 1, 2, 4, 8), 60 requests
dispatched each time. Effect: wall time of a borderline cell (30 to 35 hits of 40): the second round costs 60 request times instead of
about 15; and the p95 of all 100 requests mixes 40 measured with 4 concurrent workers and 60 measured alone, so the second-round times
are, if anything, shorter than at jobs 4. It changes no verdict rule and not the early-stop proof (no other request of the cell is in
flight at a second-round stop; the validator allows up to jobs - 1). The
scheduler is out of MS07d's scope and unchanged. Limit/number for MS07e: expect (60 x mean request time) per expanding cell; a cell
that takes above the 540 s command ceiling is the existing S-OD4 incomplete-cell rule. Route: MS07e (cost per cell), MS18c (publication),
MS18d only if a timing consequence appears. Disposition: open, numbers only.

**Timing-comparability caveat (pack author, review round 2; MS18d/MS18e):** the times of the second-round requests of an expanded
cell were measured with one worker in flight, those of the first round with up to four. The p95 of such a cell mixes the two
conditions, so it is not comparable like for like with the p95 of a cell that stopped or passed in the first round, with a p95 measured
at another `--jobs`, or with a GP timing at jobs 1; MS18d and MS18e must state the concurrency of a qualification timing when they
use it and must not treat the p95 of an expanded cell as a protected timing measurement. (MS07e's amendment is the orchestrator's; no
scheduler change is made in MS07d.)

**Observation, not an item (handoff to MS07e):** the qualifier's per-request records carry no `stats` (samples, attempts,
oracleCalls); `SG.pipeline.run` results have `attempts` and `work`, which the worker does not copy. The merger keeps every field
of a request as written, so a later worker that adds `stats` loses nothing; MS07e should report those counters as unavailable
for the qualification shards (not zero), and read them from the soak ledgers where they exist.

**Inherited (no number changes here: MS07d generates nothing; carried unchanged):** S-AV01 Greater-Than Normal CV6 (open, CV6-05
Q2(a)); S-AV02 mega12 Nightmare, S-AV03 mega16 Nightmare, S-AV24 mega Hell 1 request time (their mega records are history,
IR65: pre-split or C = 6; MS18e reruns them); S-AV04 samurai Nightmare/G13; S-AV05 and S-AV06 Killer Hard and Expert (0/12);
S-AV07 classic9 Nightmare (12/12 exact at C = 4, MS07c); S-AV08 standing quick cost: **679.4 s** at MS07d (684.3 s at MS07c;
this is the sum of this run's shard process seconds); S-AV16/S-AV17 withdrawn as current-source items; S-AV18 Greater-Than Expert
off-band misses; S-AV19 design 9.1 p95 flags; S-AV20 shallow results (diagonalX Nightmare 0/12 shallow at C = 4); S-AV21 jigsaw9
Expert exact loss; S-AV22 request-level exact losses; S-AV23 jigsaw9 cost under the target; S-AV25 Hell 1 exactness (0 of 14
mega, 0 of 2 classic9 pilot); S-AV26 classic9 Hell 1 cost indication. The MS07c handoffs stay for MS07e: the manual `difficulty`
suite is edited but unrun (only the fake-worker `qualification:` selector ran here, 6/6), the classic9 Hell 1 GD batch is expected to
fail (S-AV25), and Master availability, the Greater-Than Nightmare CV6 margin and large boards are unmeasured at C = 4.

## 7. Acceptance

| ID | Result | Evidence |
|---|---|---|
| MS07d-B01 | pass | section 3 rules 2-5; vectors "missing one of 135", "jobs 2 mixed with 4", duplicate/foreign cell, other source/qualifier/policy/rating/probe/machine/Node, overlap; M3 |
| MS07d-B02 | pass | error rows kept as misses with their code (`errors` in the summary and totals); `misses`/`time` stops proved with exact counts and the in-flight bound; an invalid reason, a stop with early stop off, a truncation without proof refused; a failed run publishes nothing; 45 scheduler runs accepted |
| MS07d-T01 | pass | 135-cell matrix of checklist Q pinned to the live registry (sizes, budgets, default attempts), seeds, jobs, machine, Node, sources, tool, policy, summaries recomputed |
| MS07d-T02 | pass | missing, duplicate, probe, incomplete outcome vectors fail with no write and byte-unchanged outputs (fake file system and real process, exit 1); a failed rename of the second output restores the first (round 2) |
| MS07d-T03 | pass | the scheduler body is byte for byte unchanged (`git diff -U0` has no hunk between the old lines 308 and 469; only the header, `cells` and the final write changed); the constants are shared; deterministic CRLF text; quick sets 3,505/3,505 and 1,750/1,750; CI check passes; fake-worker selector 6/6 |

## 8. CI group and manifest (coverage handoff)

`qualification-records` is in the shard **own-fast** of the group **own-suites** (`.github/scripts/generator-quick.json`; tests 1,632 to
1,678, own-fast 165.2 s measured, projection 220 s unchanged; the group projects 930 s of 1,800 s). No group or shard was added, and the
tool `generator/tests/qualify.js` stays in `outOfCi.tools`. The manual suites are unchanged in membership. The measured seconds of the other
shards are those of the final locked runs (core-shared 27.0, steps 16.5, replay 15.3, mega 10.1, digger-target 1.8, pipeline 309.1,
player 134.4, Player job 33.4). The suite's Node-only part writes only under the ignored `.scratch-qualification-records/`.

## 9. Changed and created files

Modified: `generator/tests/qualify.js`, `generator/tests/manual/difficulty.test.js` (its fake-worker loader only: `renameSync`,
`mkdirSync`, `rmSync` on the fake file system, `digger`/`cellCountOf`/`RATING_VERSION` on the fake engine, the two new identity stubs;
no threshold, request count or assertion), `generator/tests.html`, `generator/design.md`, `DEVELOPERGUIDE.md`, `DEVELOPERGUIDE.vn.md`,
`.github/scripts/generator-quick.json`. Created: `generator/tests/fixtures/qualification-records.js`,
`generator/tests/suites/qualification-records.test.js`, `generator/tests/artifacts/difficulty-v3/MS07d/round2-workers.js`, and this
folder `docs/difficulty-v3/evidence/MS07d/` (`evidence.md`, `invoke-dv3node.ps1`, `quick/` with the nine final result files,
`quick-log-*.txt`, `superseded-round1/` (the first-round `quick/`, `quick-superseded-first-pass/`, `ci-check.txt`, `focused-final.txt`,
`gd-fake-qualification.txt`), `ci-check.txt`, `focused-final.txt`, `gd-fake-qualification.txt`, `round2-workers.txt`).

## 10. Review round 2 (pack author's finding)

**Finding:** the output write of `qualify.js` (`publish`) was not pair-atomic: a failing second rename left the first output replaced,
so "both or none" was false. **Fix:** see section 3, "Pair-atomic write": the bytes of every existing target are kept before the
first rename; a failure restores or removes what was already replaced, removes every `.partial`, and exits 1 with a message that
says what was put back (or what could not be). **Tests added (2, suite now 46):** the injected failure of the second rename with
the targets existing, absent and mixed (all byte-unchanged or absent, no `.partial`, the rename log shows only the first), the
failure of the first rename, and the failure of a restore; the existing rejected-merge byte test is kept. **Wording corrected:**
`attempts` is the configured maximum of its board, not the attempts a request used (qualify.js header, design 15.4, both guides, this
file); the "both outputs or none" claim is now stated with the restore (design 15.4 and the suite row, both guides, the qualify.js
header). **Reruns on the final tree, under the lock:** `--suite=qualification-records,help,ui-contract` 143/143 (6.8 s); the
fake-worker selector 6/6 (3.6 s); both quick sets (3,505/3,505 Generator, 1,750/1,750 Player); the CI check (3,505 of 3,505). The
manifest numbers (`generator-quick.json`: own-fast 1,678 tests, the measured seconds) follow the final runs. Rulings accepted without
change: commit/dirty as provenance, overlapping shards rejected, `stats` unavailable not zero; S-AV27 routing is MS07e/MS18c with the
timing-comparability caveat above for MS18d/MS18e.
