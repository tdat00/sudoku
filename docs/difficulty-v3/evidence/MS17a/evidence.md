# MS17a evidence: the history version marker (store 1, envelope unchanged)

Base `d37960b` (pack-only) on the accepted implementation base `d41a6dd` (MS16); SA2's rulings Q1-Q5 are in the pack-only commit `d8bd407`. Nothing is staged or committed (the orchestrator commits). Developer: Dev-Sonnet (claude-sonnet-5.5). **Start 2026-11-18T09:19:39+07:00** (real `Get-Date`). Timing conventions: the "wall" of a locked command is the `seconds` that `Invoke-Dv3Node` reports; shard seconds are the process seconds of the shard's own line in `shard-runs.jsonl` or of its `shard X: exit N, S s` line in a group transcript; the Player's quick seconds are the `seconds=` of its tee line. Every locked command is a row of `lock-log.jsonl` (`asked`, `finished`, node seconds, wait, exit); the wrapper (`generator/tests/artifacts/difficulty-v3/MS17a/run-locked.ps1`) keeps at least 15 s between this task's locks, and the helper `invoke-dv3node.ps1` is byte-identical to MS16's (and to the check-list's).

## 0. State at the start, the QUESTION and SA2's rulings

At the start: tree clean; `d37960b` differs from `d41a6dd` only in `tasks/difficulty-v3/MS17a-history-version-marker.md` and `check-list.md`; both timing locks absent; fingerprints equal the accepted ones (`fingerprint-now.js`, one unlocked run of 1.06 s at 09:22:35, no generation): Generator `c72462e8c4f7590edba12db5662128a083a6733c5fb26978d7d332292b13401e`, Player `437d759f2c6b3ba8b359c2bd0db442f443e0153ca5847cf6d58736c4a82eb45b`; Node v26.13.0.

My `QUESTION:` (09:23:50, **before any edit**) had five points; SA2's rulings, relayed 09:35:

| # | Ruling | Applied as |
|---|---|---|
| Q1 | modified A: a visible note plus a supplementary `title` for earlier entries only; no CSS change, no placeholders. `history.item.earlier` EN "Made by an earlier version; selecting this entry regenerates the puzzle using the current rating model." / VI "Do phiên bản cũ hơn tạo; chọn mục này sẽ tạo lại đề bằng mô hình tính điểm hiện tại."; `history.item.earlier.title` EN "History stores the seed and settings, not the puzzle. Regeneration uses the current rating model, so the puzzle, difficulty level or score may change. A compatible cached result may be reused." / VI "Lịch sử lưu seed và các tùy chọn, không lưu đề. Khi tạo lại, đề, mức độ khó hoặc điểm có thể thay đổi theo mô hình tính điểm hiện tại. Có thể dùng lại kết quả trong bộ nhớ đệm nếu còn phù hợp." | the note is a second muted line (existing classes) in the open button; the explanation is the button's `title` in place of "Generate this puzzle again" for earlier entries only (my Option A; the ruling modified the wording and the visible note) |
| Q2 | accept the cases; validate the current version too; the predicate stays **private**, panel-only, no public API | a private `madeEarlier(entry)`; a missing marker: note; a valid marker: note only when it is below a valid positive-integer `SG.difficulty.RATING_VERSION`; an equal, future or (invalid current) marker: no note |
| Q3 | accept A: never inherit or manufacture a missing producer stamp | `add(..., { touch: false })` replaces the whole entry as today; the marker comes from the new entry only |
| Q4 | confirmed: fresh evidence ledgers, not canonical fixtures; focused, quick and CI gates remain | section E below |
| Q5 | the named history/documentation/count changes in both languages; no version bump, no production-scope expansion | documents section |

## 1. Bounded plan, phase D (development; written before the first run of the phase; every command locked through `run-locked.ps1`, jobs 1, <= 450 s admission, no corpus, no generation beyond the history suite's own real results)

State of the source when this plan is written: nothing edited yet (history.js, history.test.js, the documents and the manifest are untouched); only the scratch tools of `generator/tests/artifacts/difficulty-v3/MS17a/` and this folder exist.

| # | Command (from `generator/`) | Projection (s) | Basis | Output |
|---|---|---|---|---|
| D0 | `node tests\node-runner.js --suite=history` on the unmodified source (the baseline count and time of the suite) | <= 60 | stated conservative bound: four real pipeline results (classic9/killer easy, classic4 very easy) plus the private-app tests; MS05r5p's suite | `logs\d0-history-base.txt` |
| D1.. | the same, after each implementation or test step | <= 60 each | D0 | `logs\d1-history-*.txt` |
| D2 | `node tests\node-runner.js --suite=history,export,i18n,help,ui-contract` (the brief's test plan) | <= 150 | stated bound; `help` and `i18n` are string/doc suites, `export` runs real results | `logs\d2-brief-*.txt` |

Unlocked (registration or file-only, each timed): `node tests\node-runner.js --list-tests` (listing, no run), `check-format.cjs`, `check-mutations.cjs`, `fingerprint-now.js` (1.06 s measured).

**Measured so far** (`lock-log.jsonl`; plan written 2026-11-18T09:38:33, D0 asked after it): D0 `history` on the unmodified source: **15 of 15**, 3.3 s wall (`logs/d0-history-base.txt`). Implementation and tests were then written (history.js: marker, validity filter, private `madeEarlier`, the note span and the title, the two inline strings, the header; history.test.js: one pin extended (the stored-key list gains `ratingVersion`), **14 new tests**: 8 on the data, 6 on the panel through a private copy of the file with a fake document and an app double). D1 run 1: **29 of 29**, 2.8 s wall (`logs/d1-history-1.txt`). The format check (`check-format.cjs`, file-only, 0.5 s) found long lines in my first drafts (the header, comments, inline strings and test code; 112-121 columns), all rewrapped; after the last edit: `checked 12 files, 0 with problems`.

## 2. Bounded plan, phase M (mutation testing of the new logic; written before the first mutant is run)

The source is `generator/js/ui/history.js` as it stands after D1 (no edit is planned before the freeze unless a survivor or a gate asks for one; if the file changes after this run, the whole list is run again on the final bytes and the first run is kept). **50 in-memory mutants** (`generator/tests/artifacts/difficulty-v3/MS17a/mutations.cjs`, every fragment checked to occur exactly once by `check-mutations.cjs`, 0 bad), grouped: `isVersion` (5), `entryOf` (6), stored field/filters/validity/read/write/add (8), envelope version/key/identity/overrides/replacement rules (6), `madeEarlier` and its current-version rules (10), rendering/locale/result handler (10: note and title, locale refresh, opened entry's overrides and place, no stamping, imported), the four texts (5). Each runs `--suite=history` in its own child process and must fail it (`mutant-run.cjs` wraps `fs.readFileSync` for that one path, so the suite's private copy of the panel reads the mutated text too).

| # | Command (from the repository root, through `Invoke-Locked`, which wraps `Invoke-Dv3Node`) | Projection (s) | Basis | Output |
|---|---|---|---|---|
| M1 | `node generator\tests\artifacts\difficulty-v3\MS17a\run-mutations.cjs docs\difficulty-v3\evidence\MS17a\mutations-1.txt` (one compound, mutants 0-49 in order) | <= 450 admitted item by item (`elapsed + max(15, 60) <= 450`); expected about 50 x 3.5 s = 175 | D1: the unmutated suite 2.7 s wall, startup included; per-item stated bound 15 s | `mutations-1.txt`, `logs/mutations-run-1.txt` |

A survivor is analysed, never accepted by assertion: a real survivor gets a strengthened test and the whole list is run again (`mutations-2.txt`, the first run kept); an equivalent mutant is claimed only with a non-circular argument written next to it.

**Measured M1** (`lock-log.jsonl`, `mutations-1.txt`, `logs/mutations-run-1.txt`; locked, 133.7 s wall, exit 0, every mutant started within the admission rule): **50 of 50 detected, 0 survivors, no equivalent mutant claimed**, on the first run. Each mutant is killed by the tests that name its behaviour (for example the storage-key mutant by the round-trip test alone, the unvalidated current version by the "current version is validated" panel test alone, the opened entry's marker by the opening test alone, an imported result by the panel's imported case alone); the counts of failing tests are in the file. One test was strengthened before the run, not after a survivor: the opening test also compares the overrides of a marked entry with the legacy entry's (it was written to kill "opening hands on its marker", which a legacy-only comparison cannot see).

## 3. Documents (written before the focused gates and the freeze; not E-hashed)

Edited, in both languages where the file is bilingual: `USERGUIDE.md` / `USERGUIDE.vn.md` (the "Rating v2 compatibility" paragraph and the generated-puzzles bullet), `DEVELOPERGUIDE.md` / `DEVELOPERGUIDE.vn.md` (the "Puzzle history" section and the three Generator totals 4,755 -> **4,769**), `generator/design.md` (the history paragraph of section 10, the print/export sentence, the `sg.history.v1` row of section 14.3, the total, the `history.test.js` row). The count 4,769 is the registered inventory (`inventory-generator.json`: 4,769 tests in 55 suites; `inventory-player.json`: 2,978 in 32, unchanged). The unqualified "same seed, same puzzle" of the history header and of the living history wording is replaced by wording about the recipe and the current rating model; the in-app help and the controls hint (which already say "with the same version") are not history wording and are untouched. `docs/difficulty-v3/notes.md` gets its MS17a section after the final runs (it is outside both fingerprints).

## 4. Bounded plan, phase F1 (focused gates on the tree before the freeze), written before the runs

All locked (`Invoke-Locked`), jobs 1, one command per lock, outputs under `logs/`. The brief's two focused lists plus the two named in the dispatch, on the tree as it is now (history.js, tests and documents final):

| # | Command (from the app folder) | Projection (s) | Basis | Output |
|---|---|---|---|---|
| F1a | Generator `node tests\node-runner.js --suite=history,export,i18n,help,ui-contract,purity` | <= 120 | D1: history 2.7 s; MS16's F1b measured `i18n` 97, `help` 30 tests among 1,494 in 238.8 s; `export` runs real results; stated bound 120 s | `logs/f1a-generator-focused.txt` |
| F1b | Player `node tests\node-runner.js --suite=play,help,help-example-tools,i18n,ui-contract` | <= 120 | MS16's F1a measured 33.1 s for 752 tests with `tech-als` and `techniques`; stated bound 120 s | `logs/f1b-player-focused.txt` |

Expected before the runs: both pass (the history change adds no Player code; the Player guides are fingerprinted and checked by the Player's `help`, which reads the shared `USERGUIDE`/`DEVELOPERGUIDE` text and counts). Any failure is analysed first and nothing is edited to make it pass.

**Measured F1** (locked, `lock-log.jsonl`; plan written 09:50:29): **F1a Generator 344 of 344** over `history` 29, `export` 78, `help` 30, `i18n` 97, `purity` 42, `ui-contract` 68 (17.4 s wall, within 120; `logs/f1a-generator-focused.txt`); **F1b Player 294 of 294** over `help-example-tools` 51, `help` 28, `i18n` 77, `play` 75, `ui-contract` 63 (14.0 s wall; `logs/f1b-player-focused.txt`). Nothing failed and nothing was edited in the phase.

## 5. Bounded plan, phase E (written after the freeze and before the first wire run; the file's write time is the time of this plan)

**Format check before the freeze.** `check-format.cjs` after the last edit of every included source and test (history header, comments, inline EN/VI strings, test code): `checked 33 files, 0 with problems` (BOM, CRLF, no trailing whitespace, final newline, 110 columns for the engine files and for every JavaScript line this task added or changed outside `artifacts/`); the only E-hashed file that is modified is `generator/js/ui/history.js`, SHA-256 `146B174107D8...B7A9` (MS16: `79FE37F362FE...57DD`). **Freeze** (`engine-frozen.txt`, 2026-11-18T09:52:25 +07:00, tree hashes `core\js` `14BA152E...555D`, `generator\js` `60630D87...6F46`): replay identity **`9023f9eb3308b66cc84f3e0654e2785c33db5a50cf252e41c141f07344ffc99e`** (MS16: `20d5873d...`, **changed**, as the brief says: `js/ui/history.js` is in `SOURCE_FILES`), hash identity **`8740fd9e8ed34fe1d80fada564b59b5467d75f8f61be0d2c14abae92320dfb4e`** (MS16: the same, **unchanged**: `perf.js::engineFiles` skips `^js/(ui|worker)/`). No included byte may change after this point; if one does, the affected family is recorded again, not retagged.

| Phase | Items | Projection (s, summed; compounds admitted item by item at `elapsed + max(projection, 60 s) <= 450 s`) | Basis | Output |
|---|---|---|---|---|
| E1 wires | G09-G13 (5): `node tests\replay-fixtures.js --ids=G.. --record=..\docs\difficulty-v3\evidence\MS17a\wire\G...json` | 331 (G09 102, G10 43, G11 63, G12 14, G13 109) | `plan-wire.json` (made by `make-plans.cjs`): 3 x MS16's final shard + 10 s (MS16 measured 30.4, 11.0, 17.4, 1.1 and 32.9 s, 92.96 s for the compound); no engine byte changed, so the work is MS16's | `wire/`, `shard-runs.jsonl`, `logs/g-wire-*.txt`, `logs/merge-check-wire.txt` |
| E2 analyses | G01-G14 (14): `node tests\replay-goldens.js --ids=G.. --record=..\docs\difficulty-v3\evidence\MS17a\analysis\G...json` | 570 | `plan-analysis.json`, same rule (MS16: 141.4 s) | `analysis/`, `logs/g-analysis-*.txt`, `logs/merge-check-analysis.txt` |
| E3 hashes | not recorded: the hash identity is unchanged, so MS16's 104 ledgers are **retained**; one read-only `node tests\perf.js --hash-merge=..\docs\difficulty-v3\evidence\MS16\hashes --check-hashes` (nothing is generated, no `--update-hashes`) | <= 30 (merge only; MS13b measured 0.6 s for the same step) | retained MS16 evidence, merge-checked on the current identity | `logs/merge-check-hashes.txt` |

Order and rules: the five wires first, then **`node tests\replay-fixtures.js --merge=..\docs\difficulty-v3\evidence\MS17a\wire --check`** against the unchanged `replay-wire.js`, and only after that the fourteen analyses and **`node tests\replay-goldens.js --merge=..\docs\difficulty-v3\evidence\MS17a\analysis --check`** against the unchanged `replay-goldens.js`; at least 15 s between the lock turns (the wrapper enforces it); one locked command per payload, at most 540 s; **no `--write`, no `--update-hashes`**, no canonical fixture or hash fixture is touched; G13's 120000 ms recorder guard is the fixture's and is kept. The original requests are read from the fixtures, not replaced. **A breach of the guard, a value that differs from the canonical wires or analyses, a hash-identity difference or a refused merge is a `QUESTION:` before anything else is run or written.** After E: `engine-after-e.txt` re-hashes every included file and must equal the freeze apart from its first line.

## 6. E results, then the bounded plan for GH (the GH plan is written before its command; the file's write time is the time of this plan)

**E1 wires** (`wire/G09-G13.json`, one compound, 2026-11-18T09:53:03 to 09:54:37 +07:00, **93.5 s** wall, `shard-runs.jsonl`): G09 30.4 s, G10 11.0 s, G11 18.1 s, G12 1.2 s, **G13 32.7 s** (projections 102, 43, 63, 14, 109 s), all exit 0, every item within its projection; MS16 measured 30.4, 11.0, 17.4, 1.1 and 32.9 s. G13's 120000 ms recorder guard is the fixture's and was not breached. **Merge-check before the analyses** (`logs/merge-check-wire.txt`, locked, check-only, 0.6 s): `merged 5 ledgers: all 5 keys exactly once, recorded from the current sources`; **G09, G10, G11, G12 and G13 all match `replay-wire.js`**; `replay-wire.js is up to date`. Nothing to explain and nothing to write.

**E2 analyses** (`analysis/G01-G14.json`, one compound, 09:55:08 to 09:57:30, **142.6 s** wall): G01 1.0, G02 0.6, G03 1.8, G04 12.1, G05 13.3, G06 2.3, G07 2.2, G08 0.6, G09 30.2, G10 11.2, G11 18.4, G12 1.5, **G13 39.6**, G14 7.7 s (MS16: 141.4 s), all exit 0 and within their projections (570 s summed). **Merge-check** (`logs/merge-check-analysis.txt`): `merged 14 ledgers: all 14 keys exactly once, recorded from the current sources`; **all 14 match `replay-goldens.js`**; `replay-goldens.js is up to date`.

**E3 hashes, retained MS16 ledgers** (`logs/merge-check-hashes.txt`, locked, read-only, 0.7 s): `merged 104 ledgers: all 520 keys exactly once, recorded from the current sources`; `regression hashes: all 520 puzzles unchanged (merged ledgers, nothing generated)`. The ledgers are MS16 evidence (`docs/difficulty-v3/evidence/MS16/hashes`), not 520 new MS17a generations, and nothing was copied or retagged; the hash identity `8740fd9e...` is the freeze's, the same as MS16's.

**Identities and writes.** The replay identity changed (`20d5873d...` to `9023f9eb3308b66c...`) and all 19 fresh ledgers carry it; the hash identity did not change. No `--write`, no `--update-hashes`: `git status` shows no change to `replay-wire.js`, `replay-goldens.js` or `regression.js` (the canonical outputs are unchanged, 5 wires, 14 analyses and 520 hashes). `engine-after-e.txt` (09:58:10 +07:00) re-hashes every included file: **identical to `engine-frozen.txt` apart from its first line** (89 lines each, 0 differences). No unexpected value, so no QUESTION arose in E.

**GH plan (check-only, no discovery, no write, no source acquisition).** One locked command from `player/`, the complete check of all 40 catalogue examples with the Player's own hint code on the Generator's engine:

| # | Command | Projection (s) | Basis | Output |
|---|---|---|---|---|
| GH1 | `node tests\tools\make-technique-examples.js ..\generator --max-puzzles=64 --max-hints=400 --check` | <= 60 | MS16 G6 and G1: 0.3 to 3.9 s for the 39/40 examples (27 puzzles replayed); stated bound 60 s | `logs/gh-check-all-40.txt` |

Expected: `help-examples.js is up to date for the 40 selected ID(s)`, every ID `matches help-examples.js`. A failure, a missing example or a displaced one is a `QUESTION:` (no refresh, no source search, no discovery batch).

**Measured GH1** (locked, `lock-log.jsonl`; plan last written 09:58:40, run asked 09:58:46): `logs/gh-check-all-40.txt`, **4.0 s wall (3.9 s process)**, exit 0: `selected 40 technique ID(s); mode check`, `replaying 28 puzzle(s) for 40 ID(s) (--max-puzzles=64, --max-hints=400)`, every one of the 40 IDs `matches help-examples.js`, `help-examples.js is up to date for the 40 selected ID(s)`. Check-only: no discovery, no write, no source acquisition (`git status` shows no change to `help-examples.js` or to any Player file); the catalogue holds the same 40 examples (the Sue de Coq example is the saved one of MS16).

## 7. Final complete quick pair: plan (written after the guides, counts and design were final and the format check was clean, and before the runs)

**State.** Included in the fingerprints and final: `generator/js/ui/history.js`, `generator/tests/suites/history.test.js`, the four guides (`USERGUIDE.md`/`.vn.md`, `DEVELOPERGUIDE.md`/`.vn.md`) and `generator/design.md`; the manifest and the notes are outside both fingerprints and are finished after the runs and before the CI check. Fingerprints of the tree now (`fingerprint-now.js`, 0.5 s, before the runs): Generator `bae8cc894b398fb6b3f6ba868c37dedd90a6b219da2703d7d2e0aab110596d8f` (MS16: `c72462e8...`), Player `1dfe66ea5a761c58e10859d7aea226869cb58f35c15c14c4803e77179e1eb6d7` (MS16: `437d759f...`; it moved only because the guides it reads changed, no Player source did). Registered inventories (`inventory-generator.json`, `inventory-player.json`): Generator **4,769 tests / 55 suites** (4,755 + 14), Player **2,978 / 32**. Both runs use the same Node v26.13.0, the same machine and time factor 2 as MS16.

| # | Command (through `Invoke-Locked`, jobs 1, one command per lock, >= 15 s between) | Projection (s) | Basis (MS16 `quick-final` wall of the same group; 1.5 x, rounded up) | Output |
|---|---|---|---|---|
| Q1 | `node ..\.github\scripts\generator-quick.js run shared-small --results-dir=..\docs\difficulty-v3\evidence\MS17a\quick-final` (core-shared, steps, replay, mega) | <= 360 | 236.8 s | `quick-final/log-shared-small.txt`, `generator-*.json` |
| Q2 | `... run own-suites ...` (own-fast, digger-target) | <= 320 | 211.8 s; +14 history tests (about +2 s) | `quick-final/log-own-suites.txt` |
| Q3 | `... run pipeline ...` | <= 65 | 43.0 s | `quick-final/log-pipeline.txt` |
| Q4 | `... run replay-player ...` (the Generator's `player` shard) | <= 90 | 57.9 s | `quick-final/log-replay-player.txt` |
| Q5 | Player `node tests\node-runner.js --results=..\docs\difficulty-v3\evidence\MS17a\quick-final\player-quick.json` | <= 180 | 116.8 s | `quick-final/log-player-quick.txt`, `player-quick.json` |

Each is below the 450 s admission and the 540 s ceiling; the Generator is the four bounded manifest groups, not one whole command. Pass criteria: every command exit 0, every results file `complete: true` with the sourceHash of the tree's fingerprint above, Generator **4,769 of 4,769**, Player **2,978 of 2,978**, every quick test in exactly one shard. A failure is analysed first and nothing is edited to make it pass; if a fingerprinted file must change afterwards, the affected runs are repeated. The projection revision uses `max(old, 10 x ceil(1.5 x m / 10))` with m the process seconds of the shard in the complete successful run, raises only, and the manifest (counts, seconds, projections, provenance) is finished before the CI check, which is run last and saved.

## 8. Final complete quick pair, projections, fingerprints (all locked, exit 0, `quick-final/`; plan of section 7 written 09:59:45, first run asked 09:59:52)

| Set | Result | Command walls (`lock-log.jsonl`) |
|---|---|---|
| Generator (55 suites, four group commands) | **4,769 of 4,769** (core-shared 2,418; steps 58; replay 158; mega 108; own-fast 1,732; digger-target 75; pipeline 151; player 69) | 226.3 + 215.9 + 43.5 + 58.8 = **544.4 s** (the `seconds=` of the four group commands: 226.160 + 215.773 + 43.393 + 58.546 = **543.9 s**); each within its Q projection (360, 320, 65, 90) |
| Player (32 suites) | **2,978 of 2,978** | 119.0 s wall (process **118.894 s**), within 180 |

The accepted baseline was 4,755 tests (549.4 s) and 2,978 (116.8 s): **+14 tests**, all in the history suite (15 to 29; own-fast 1,718 to 1,732), **S-AV08 re-measured** against MS16's accepted `quick-final` (its group transcripts: 236.796 + 211.757 + 42.962 + 57.907 = **549.4 s** command seconds, 550.0 s of lock walls; its Player 116.812 s): the Generator command seconds **543.9 s (-1.0 %, for +0.3 % tests)** and the Player **118.894 s (+1.8 %, no Player test added)**. No stop, and no claim that the code is faster or slower: the history tests cost 1.8 s, the rest is run-to-run spread on a shared machine.

**Per-shard seconds** (`shard X: exit 0, N s` of the group transcripts and the Player tee line): core-shared 104.5, steps 44.3, replay 43.6, mega 32.1, own-fast 212.0, digger-target 2.7, pipeline 42.9, player 58.1; Player job 118.894.

**Projection revision** (SA2's rule of 2026-11-16: new = max(old, 10 x ceil(1.5 x m / 10)), m the process seconds of the shard in the complete successful run; raises only; machine: this Windows x64 host, Node v26.13.0, time factor 2; sources `quick-final/log-*.txt`):

| Shard | old | m | calculation | new | group / job total |
|---|---:|---:|---|---:|---|
| core-shared | 170 | 104.5 | 10 x ceil(15.675) = 160 | **170** (the old stays) | shared-small: 180 + 3 x (170 + 70 + 70 + 50) = **1,260** of 1,800 |
| steps | 70 | 44.3 | 10 x ceil(6.645) = 70 | **70** | |
| replay | 70 | 43.6 | 10 x ceil(6.54) = 70 | **70** | |
| mega | 50 | 32.1 | 10 x ceil(4.815) = 50 | **50** | |
| own-fast | 320 | 212.0 | 10 x ceil(31.8) = 320 | **320** | own-suites: 180 + 3 x (320 + 30) = **1,230** of 1,800 |
| digger-target | 30 | 2.7 | 10 x ceil(0.405) = 10 | **30** (the old stays) | |
| pipeline | 80 | 42.9 | 10 x ceil(6.435) = 70 | **80** (the old stays) | 180 + 3 x 80 = **420** of 1,800 |
| player (Generator shard) | 90 | 58.1 | 10 x ceil(8.715) = 90 | **90** | 180 + 3 x 90 = **450** of 1,800 |
| Player job | 180 | 118.894 | 10 x ceil(17.834) = 180 | **180** | 180 + 3 x 180 = **720** of the actual 900 |

**No projection rises** (every formula result is at most the old value; own-fast and steps/replay/mega/player/Player sit exactly on it); every projection is <= 450 s; each Generator group satisfies `180 + 3 x sum <= 1,800`, the Player job `180 + 3 x 180 = 720 <= 900`. The manifest edit (`.github/scripts/generator-quick.json`): the `measuredSeconds` of all eight Generator shards and of the Player, the own-fast count 1,718 to 1,732 and the provenance text (an MS17a sentence), nothing else (no group, suite, command, factor, overhead, timeout or tier). It is JSON-valid, its shard tests sum to 4,769, and it was saved before the CI check below (SHA-256 `4A4943C7FBAEA0E58D94429D37C23FB8F9ADF3D5ED22A2FB8A9775EA72F8D0CF`).

**Fingerprints.** `fingerprint-now.js` after the runs and again after the manifest edit and the last format check: Generator `bae8cc894b398fb6b3f6ba868c37dedd90a6b219da2703d7d2e0aab110596d8f`, Player `1dfe66ea5a761c58e10859d7aea226869cb58f35c15c14c4803e77179e1eb6d7`; **all eight Generator results files carry the Generator value and `player-quick.json` the Player value, every one `complete: true`**. The manifest, the notes and the evidence are outside both fingerprints.

## 9. CI check: plan (written before the command)

`"C:\Program Files\Git\bin\bash.exe" .github/scripts/generator-suites.sh check` from the repository root through `ci-check.cjs` and `Invoke-Locked` (it registers the runners but runs no test; MS13b measured 4.6 s); output `quick-final/ci-check.txt`. Expected: `Generator quick set: 4769 tests in 55 suites; Player quick set: 2978 tests in 32 suites`, the four groups 1,260 / 1,230 / 420 / 450 s of 1,800, `Player job: projected 720 s` (of the generic 1,800; the actual limit 900 is checked by the arithmetic above), every quick test in exactly one shard (4769 of 4769), exit 0. A later edit of the manifest repeats this check.

**Measured CI check** (locked, `quick-final/ci-check.txt`; plan first written 10:13:11 and last edited 10:13:46, run asked 10:13:53, 5.2 s wall, exit 0): `Generator quick set: 4769 tests in 55 suites; Player quick set: 2978 tests in 32 suites`; `shared-small` 4 shards, 2,742 tests, projected **1,260 s**; `own-suites` 2 shards, 1,807 tests, **1,230 s**; `pipeline` 1 shard, 151 tests, **420 s**; `replay-player` 1 shard, 69 tests, **450 s** (each of 1,800); `Player job: projected 720 s of 1800 s` (the generic ceiling; the actual 900 s limit holds by the arithmetic of section 8); `Every quick test is in exactly one shard (4769 of 4769), no manual or unknown suite, no empty shard, every job inside its limit: check passed`. The manifest has not been edited since (SHA-256 `4A4943C7...D0CF`), and `quick-final/fingerprint-final.txt` repeats the two fingerprints after the check: Generator `bae8cc89...6d8f`, Player `1dfe66ea...b6d7`, equal to every results file.

## 10. Plans and their write times (the file's own times; every payload was started in a later step than the read-back of its plan)

| Phase | Plan section | Last write before the phase | First payload asked |
|---|---|---|---|
| D (development) | 1 | 09:38:33 | D0 09:38:42 |
| M (mutants) | 2 | 09:45:18 | M1 09:45:25 |
| F1 (focused gates) | 4 | 09:50:29 | F1a 09:50:37 |
| E (wires, analyses, retained hashes) | 5 | 09:52:57 (first 09:52:50; the per-item projections in the table were corrected to the plan files' own values) | E wires 09:53:03 |
| GH | 6 | 09:58:40 (first 09:58:26; two times in the E results text corrected) | GH1 09:58:46 |
| Q (complete quick pair) | 7 | 09:59:45 (first 09:59:37; "three guides pairs" corrected to the four guides) | Q1 09:59:52 |
| CI check | 9 | 10:13:46 (first 10:13:11; the S-AV08 comparison and the manifest SHA of section 8 were corrected) | CI 10:13:53 |

**Corrections made after a plan or a result paragraph was first written, all before the command that follows it:** (a) the E plan's per-item projections (G09 100 to 102, G11 64 to 63, G13 110 to 109) matched the plan files only after the correction; (b) two times of the E results text (E1 end 09:54:37, E2 09:55:08 to 09:57:30); (c) in section 8 a first draft compared the Generator with "MS16's recorded 543.6 s" and explained the brief's 549.4 s as "a sum of lock walls": **that explanation was not verified and was wrong** (MS16's accepted `quick-final` transcripts give 549.4 s of command seconds, 550.0 s of lock walls, Player 116.812 s); it was replaced by those figures at 10:13:38 and the manifest provenance sentence was changed the same way before the CI check, so the recorded manifest SHA is that of the final file; (d) the manifest's own MS16 sentence still quotes 543.6 s / 116.5 s, which I did not change (history of that task).

## 11. Compatibility vectors and strings (handoff to MS17b)

`SG.difficulty.RATING_VERSION` is **read at render time**, so the same code works when MS17b makes it 3 (the panel tests already run with a stubbed current of 1, 2, 3 and invalid values). Vectors, by the panel suite with current 3: no marker, 1 and 2 show the note and the title; 3, 4 and 99 show neither. With current 2 (now) the "current version is validated" test asserts: no marker and 1 show them, 2 does not (and with current 1 only the missing marker does); a marker above the current one is asserted against current 3, not again against 2. Stored envelope: `{"version":1,"entries":[... "ratingVersion": 2 ...]}`, a hand-written legacy entry has no key; `"2"`, 2.5, 0, -3, null, true, `[2]`, `{v:2}` and `""` are read as missing with the recipe kept. Strings (SA2's rulings, inline in `history.js`; keys `history.item.earlier` and `history.item.earlier.title`): EN "Made by an earlier version; selecting this entry regenerates the puzzle using the current rating model." / "History stores the seed and settings, not the puzzle. Regeneration uses the current rating model, so the puzzle, difficulty level or score may change. A compatible cached result may be reused."; VI "Do phiên bản cũ hơn tạo; chọn mục này sẽ tạo lại đề bằng mô hình tính điểm hiện tại." / "Lịch sử lưu seed và các tùy chọn, không lưu đề. Khi tạo lại, đề, mức độ khó hoặc điểm có thể thay đổi theo mô hình tính điểm hiện tại. Có thể dùng lại kết quả trong bộ nhớ đệm nếu còn phù hợp." **Nothing in MS17a installs version 3**: `RATING_VERSION` and the cache `SCHEMA_VERSION` are untouched (`generator/js/engine/difficulty.js`, `generator/js/ui/cache.js`), the engine and every canonical fixture are byte-identical to the base, and the actual producer's version (2 today) is what new entries copy.

## 12. IR72 A to J (a UI-only history task: A, C and D have no technique to apply, so their items are marked, the rest are met)

| Item | Result | Evidence |
|---|---|---|
| A1-A3 | Not applicable (no pattern or proof). The analogue is the marker's vectors: every case of the brief (legacy, current, a known older, a future, missing, malformed) is a test on both the data and the panel; no invented board | sections 1-2, 11 |
| B1, B2 | Not applicable: no ID, weight, order, reference or rating; the engine files are byte-identical | `engine-frozen.txt` |
| C1-C4 | Not applicable: no limit, budget or observer | |
| D1-D3 | Not applicable: no technique, fixture or registry entry | |
| E1 | The two strings in EN and VI inline in the history pack, no duplicate registration, no placeholder; the `i18n` suite (97) passes | section 4 |
| E2 | Guides EN and VI in step, design 10/14.3/15, one `notes.md` section | section 3 |
| E3 | Quick totals 4,755 to 4,769 in both developer guides and `generator/design.md`; the Player 2,978 unchanged; grep for the old number after the edits: no `4,755` or `4.755` remains in the guides, the designs, `docs/architecture.md`, the Generator sources or suites | section 3 |
| F1 | 50 mutants, 50 detected on the first run, 0 survivors, no equivalent claimed | section 2 |
| G1, G3 | The two families whose identity changed recorded whole on the frozen bytes (5 wires, 14 analyses) in IR12 compounds with per-item projections, wires merge-checked before the analyses; the 520 hashes retained and merge-checked; no included byte changed after the freeze (`engine-after-e.txt`) | sections 5-6 |
| G2 | No changed key (nothing to explain, nothing written) | section 6 |
| H1 | `--check` of all 40 passes; no ID refreshed, no discovery | section 6 |
| I1, I2 | Files of the task only; **no pin refreshed**; one existing pin extended as the brief says (the stored-key list gains `ratingVersion`); nothing removed, skipped or loosened; the manifest: information fields only | section 13 |
| J1 | Focused suites, both complete quick sets on the final tree and the CI check; one locked command per payload at most 540 s; compounds per IR12; at least 15 s between locks | sections 4, 6, 8, 9, 15 |
| J2 | After the final quick sets only the manifest, `notes.md`, the evidence and the scratch folder were edited; fingerprints recomputed at the end equal the results files | section 9 |
| J3 | Base commit `d37960b` on `d41a6dd`, SA2's rulings in `d8bd407`, no commit landed during the task (the orchestrator commits), the timing conventions stated in the header | header |

## 13. Files changed

Production: `generator/js/ui/history.js`. Tests: `generator/tests/suites/history.test.js`. Documents: `generator/design.md`, `USERGUIDE.md`, `USERGUIDE.vn.md`, `DEVELOPERGUIDE.md`, `DEVELOPERGUIDE.vn.md`, `docs/difficulty-v3/notes.md`. CI metadata: `.github/scripts/generator-quick.json` (information fields and the provenance text only). Evidence: this folder (`evidence.md`, `lock-log.jsonl`, `shard-runs.jsonl`, `engine-frozen.txt`, `engine-after-e.txt`, `inventory-*.json`, `mutations-1.txt`, `wire/`, `analysis/`, `quick-final/`, `logs/`). Scratch: `generator/tests/artifacts/difficulty-v3/MS17a/` (the lock wrapper, the mutation harness and list, the E plans and driver, the quick runner, the format, fingerprint and freeze checks). **Not touched:** the engine, `core/`, the cache, the store, every Player file, `replay-wire.js`, `replay-goldens.js`, `regression.js`, `help-examples.js`, `tasks/`, any git state.

## 14. Honest gaps and disclosures

- **No browser run.** The panel is exercised on a fake document; the wrapping of the long note line in the narrow left panel, the focus and title behaviour and the colour of the muted line are unseen (the line reuses `history-item__meta`, no CSS was added).
- **Reading of the ruling.** I read "supplementary title for earlier entries only" as my Option A (the explanation replaces the button's title "Generate this puzzle again" for earlier entries; every other entry keeps it). If the orchestrator wants both texts, it is one line in `item()` and one test.
- **A marker is a positive integer by `Number.isInteger(x) && x > 0`**, the literal reading of the brief: a very large double such as 1e21 is valid and kept; it is not tested and no claim is made about it.
- **An entry without a marker is not shown as "provably" anything**: the note's wording is SA2's and says "made by an earlier version", which for a marker-less entry is the generic R22 wording, not a proof of its producer.
- The panel tests are Node-only (`SG.test.skip` without the file system), like the private app harness beside them.
- The `edit` tool reported "old_str did not match the file exactly, so the closest matching lines were replaced" on many edits (a CRLF matter); every result was read back, and `check-format.cjs` confirms no lone LF, no BOM, no trailing whitespace and a final newline in every changed file.
- Format failures of my first drafts (history header, comments, inline strings, test code: 112 to 121 columns) were fixed before any run that mattered; the check passed before the freeze and at the end (`checked 94 files, 0 with problems`).
- No equivalent mutant was claimed; no survivor occurred, so no test was added after the mutation run (one assertion was added before it, section 2).
- No corpus scan, no discovery, no acquisition, no generation beyond the history suite's own real results and the E recorders; no GP, GQ, soak or manual suite.

## 15. Locks, unlocked and aborted runs

**Locked:** 17 records in `lock-log.jsonl` (D0, D1, M1, F1a, F1b, the E wire and analysis compounds, the three E merge-checks, GH1, the five quick commands, the CI check), **1,081.8 node seconds in total**, every exit 0, no error row, the largest recorded wait 0.1 s (the wrapper's enforced pauses are not in that column), **at least 15.01 s between a release and the next request**; no compound exceeded 450 s (the longest, M1, 133.7 s; the analyses 142.6 s; the largest quick group 226.3 s); no 540 s ceiling was approached. Both timing locks were absent at the start and at the end; no lock of anyone else was touched or removed, and none of mine remains.

**Unlocked (all short, none generated a puzzle):** `fingerprint-now.js` six times (the first timed at 1.06 s, the others returned within a few seconds and were not timed one by one); `check-format.cjs` about fifteen times (0.5 s, timed once); `check-mutations.cjs` once (0.10 s); `make-plans.cjs` once (0.11 s); `freeze-hashes.cjs` twice (0.27 s timed once); `node tests\node-runner.js --list-tests` as two registration-only inventories (0.79 s and 0.49 s) and one invocation without its file argument that only printed the usage (0.11 s); a few `node -e` and PowerShell inspections of JSON and ledgers, `git status`/`diff` calls and hashing; the file creations and edits through the tools. **Aborted or stopped runs: none** (no command was stopped, killed or timed out; the one failed tool call was a PowerShell path typo in a directory listing before any node run).

**End 2026-11-18T10:16:27 +07:00** (real `Get-Date` of the last verification: format check, both fingerprints equal to every results file, `history.js` and the manifest unchanged since their recorded SHA-256, no lock left; the start was 09:19:39, so about 57 minutes, including the wait for SA2's rulings between 09:24 and 09:35).
