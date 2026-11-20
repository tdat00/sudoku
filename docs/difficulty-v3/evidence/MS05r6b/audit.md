# MS05r6b: the combined recovery audit

Audit of the whole S-OD2 recovery on the preserved candidate: MS05b1 (retained), MS05b2/b3-era duties absorbed by r2 to r4 and
r6, r1 to r5 (r5p with its legacy-8 round, r5m), b3 and r6a. Evidence is in this folder (`evidence.md` is the index); paths are
relative to the repository root. The audit is a reading of the final-source results, not a second implementation review:
the step evidence of each task stays as its owner wrote it.

**Verdict: ready for the combined commit from the point of view of this audit, pending MS05r6c's CI closure.** Everything the
audit could check is met. The first full Generator run found one real defect in the quick set (`generator/i18n/9`, R6B-F01,
see "Findings"); the MS05r5p fix round repaired it (SA2's decision (a)) and every Generator shard was run again on the new
fingerprint: the Generator quick coverage is now complete **and green** (3,262 of 3,262 keys once, all passed) and Player
stays green (1,683 of 1,683). The first run's results are kept as history in `quick/` and are not the final coverage. The two
GD hit-rate failures and the other availability findings are named items, none a correctness failure.

Final-source counts used below (`quick-final/reconciled.json`, `audit-counts-final.json`): Generator `7d3102d3…`, 3,262 of
3,262 passed; Player `1d0724c3…`, 1,683 of 1,683 passed.

## 1. MS05b1 (retained engine and UI): B01 to B03, T01 to T05

| ID | Verdict | Evidence on the final source |
|---|---|---|
| B01 a shallow result cannot block or impersonate required exactness | Met | `pipeline` T01 (5 of 5: `pipeline#97` to `#101`) and T03 (12 of 12: `#108` to `#119`), for example `#98` (a shallow rating after a required one is no gain) and `#108` (sampling stops at the first exact sample; a shallow sample does not block it); classic9 GD: every per-puzzle I5 test passes in all 8 levels (`gd/*.json`); the 14 deep records each carry the independent exact flag and both warnings (`deep/reconciled.json`, correctness pass) |
| B02 finding a required keeper ends unnecessary search at once | Met | `pipeline#108`, `#110`, `#111`, `#115` (an exact keeper ends the sampling and the attempt; a required lower-score neighbour is kept and no further proposal is made; a refinement to a required rating returns at once) |
| B03 shallow fallback explained in both languages with Retry; no invalid puzzle published | Met | `events#64` (a shallow tune result highlights the retry line), `i18n#57` (the compare line and the shallow notice in both languages), `pipeline#121` (`tune.shallow`, required false), `cache#19` and `worker#54` (a shallow fallback keeps exact false and both warnings across the cache and the wire); 14 of 14 deep records and the 186 manual results: every per-puzzle validity, uniqueness and warning assertion passed |
| T01 quality 0.5/0, reverse order, exact ties, null/ambiguous counts | Met | `pipeline#97` to `#101`, 5 of 5 |
| T02 the actual model in every rating/prefilter; safety replacement and sign-memo invalidation | Met | `pipeline#102` to `#107`, 6 of 6 |
| T03 every refinement branch outcome and the keeper-zero local stop with exact work/proposal assertions | Met | `pipeline#108` to `#119`, 12 of 12 (the five refinement outcomes are `#115` to `#119`) |
| T04 hit true, shallow false, every miss null; solved off-band; explanation highlight and grammar | Met | `pipeline#120` to `#126` (7), `events#64`, `i18n#57`: 9 of 9, including `#122` (a solved off-band sample is `tune.miss` with required null) |
| T05 sync/cooperative parity, original caps, worker/cache flags, full bounded quick coverage and explained final-source GG/GR | Met | parity and caps: the `pipeline` suite (150 of 150) incl. `#114`; flags: `cache#19`, `worker#54`; GG/GR: r6a's complete E and this task's merge checks, run twice (5 wires, 14 analyses, 520 hash keys, all current, `logs/e1`-`e3` and `e4`-`e6`); full bounded quick coverage: Generator 3,262 of 3,262 passed in 7 shards on `7d3102d3…`, Player 1,683 of 1,683 (`quick-final/reconciled.json`) |

## 2. Absorbed MS05b2 (consumers): B01, B02, T01 to T04

| ID | Verdict | Evidence |
|---|---|---|
| B01 consumers never count an in-band shallow result as exact | Met | r2's strict producer flags: the `difficulty-diagnostics` suite, 82 of 82; b3's 186 manual results count only exact hits (the failures are aggregate availability assertions) |
| B02 invalid overrides cannot produce misleading certificate evidence | Met | the prefix rejection tests of `difficulty-diagnostics` (82 of 82, zero-generation exits), `recovery-profile` 27 of 27 |
| T01 false/absent exact is a miss; the qualifier keeps every independent guard | Met | GD group `qualification:` (6 of 6, `gd/qualification.json`), the r2 tests above |
| T02 all variant/level prefixes; invalid override exits 2 before generation | Met | as B02 |
| T03 seven manual contracts keep counts/budgets/thresholds and pass syntax; early I5/CV3 and classic9 GD | Met | b3: 186 cells run (`MS05b3/outcomes.json`), retained under the IR08 store-only proof (`gd/manual-compatibility.json`); classic9 GD: 153 of 154 tests (`gd/reconciled.json`); the seven sites are unchanged since b3 (no manual file differs from b3's fingerprint) |
| T04 no output change; complete final quick coverage | Met | no engine or fixture change by r6b; quick coverage as T05 above |

## 3. Absorbed MS05c (allowance instrumentation): B01, B02, T01 to T04

| ID | Verdict | Evidence |
|---|---|---|
| B01, B02 selected cap based on measured benefit; no guess, no hidden restriction | Met | r3's counters and r4's fixed 288-request selector (retained, 256 selected); `SHALLOW_SEARCH_DEFAULT = 256` at `generator/js/engine/digger.js:668`, no override anywhere (the defaults in `standing-quick-cost.json`) |
| T01 exact allowance counting, first-exact priority, refinement ordinals/memos, caps | Met | the 20 `MS05r3` tests (`pipeline` 16, `worker` 2, `cache` 1, `recovery-profile` 1), all passed |
| T02 per-request conservation, partial errors, worker/cache work round trips | Met | `pipeline`, `worker`, `cache`, `recovery-profile` (27 of 27) |
| T03 Infinity parity; seeded shard plans match unsharded runs | Met | r3's evidence; the suites above |
| T04 override/reference/shard tests; complete final quick coverage | Met | as T05 above |
| the original GR obligation | Met | r6a's final-source E, current per the three merge checks of this task |

## 4. Absorbed MS05d (selection and closure): B01, B02, T01 to T04

| ID | Verdict | Evidence |
|---|---|---|
| B01, B02 the fixed hit/work rule selects the default; none returns to the owner | Met | r4: 288 selecting requests, 256 selected (answered by CV6-03), unchanged here |
| T01, T02 literal R5 selector, full comparison | Met | `MS05r4/` (retained history; not rerun) |
| T03 default-only edit; final E/pins; full quick | Met | the literal is the one edit; E current; quick coverage as T05 above |
| T04, original GD: complete classic9 and an explicit outstanding CV3 list | Met except one unexecuted test (S-AV15, not passing coverage; relabelled by the orchestrator after SA1's IR16) | classic9 GD: 151 of 154 passed, 2 aggregate availability failures (Normal 86 of 100, Nightmare 21 of 100), 1 outstanding (the confusion matrix, S-AV15); b3's `deferred-cv3.json` is empty and its 19 failed availability assertions are carried (S-AV02 to S-AV13) |

## 5. Recovery steps, corroborated on the final source

| Step | What it handed over | Checked now |
|---|---|---|
| r1 profiles | three one-attempt work profiles; no production change | `recovery-profile` 27 of 27 |
| r2 consumers | strict exactness in soak/qualifier/manual sites; prefix rejection | `difficulty-diagnostics` 82 of 82; the seven manual sites by b3's 186 cells |
| r3 allowance/work | per-invocation counters at Infinity, shards | the 20 `MS05r3` tests, 20 of 20 |
| r4 selection | 256; the retained original-limit failures | the literal; history untouched; the failed preflights stay failed history (S-OD3) |
| r5p size defaults and the legacy-8 round | `defaultMaxAttempts` 8/4/2, intent marker, CV6-04 (b) | the 45 `MS05r5p` tests, 45 of 45, incl. the 6 `MS05r5p-CV6-04` cases (`store#73` to `#78`); `store` 85 of 85, `controls` 46, `history` 15, `export` 78, `variants-registry` 12; the exact-diff store proof rechecked (below); after the R6B-F01 fix round the private app copies of `history` and `cache` isolate `SG.localeFragments` and assert the host list unchanged |
| r5 inventory and results tooling | `--list-tests`, `--exact`, `--results`, the draft manifest | `harness` 25 of 25; the inventories 3,262 and 1,683 and the migration from the draft (3,207 and 1,683) are exact (`quick-final/inventory-migration.json`) |
| r5m mega Nightmare contract | quick replacements `mega#96` to `#99`, `mega-contract`, 14 deep records | `mega` 111 of 111 (the mega12 one-attempt request took 4.975 s), `mega-contract` 37 of 37; `deep/reconciled.json`: 14 of 14, complete, sound, correctness pass, 6 of 6 relations; both `currentMatches` read (below) |
| b3 manual corpora | `manual-corpus` 46 tests, 186 manual results, the two live mega CV3 cells | `manual-corpus` 46 of 46; the 186 retained (`gd/manual-compatibility.json`, rechecked as `gd/manual-compatibility-final.json`); the live cells reconciled with the deep occurrence ids (`deep/live-cv3.json`) |
| r6a G13 persisted, E, pins | five wires, 14 analyses, 520 keys, 13 pins | the G13 spy tests 3 of 3 (`steps#0`, `replay#25`, `player#0`); `steps` 57, `replay` 153, `player` 69, `replay-recorders` 39 all passed; the three merge checks current |

**Exact-diff proofs, revalidated on the final tree.**

- *Deep records (B1).* `deep/reconciled.json`: `identity.currentMatches` = `{ sourceHash: false, toolHash: true }`, kept as the
  tool wrote it. `deep/compatibility.json` (script `deep-compat.cjs`) shows that the producer snapshot
  `refs/dv3-wip/MS05r5m-done-20261114-0230` (`ad77fdf`) hashes, with its own `SOURCE_FILES`, to the recorded `fee8b8d6…`; that
  the final tree hashes to `a073f9bd…`; that the only changed one of the 63 `SOURCE_FILES` is `generator/js/ui/store.js`, whose
  diff has the same `+`/`-` lines as `MS05r5p/legacy-8-fix/store-diff.patch` (the file's SHA-256 is still the recorded
  `818d5db9…`); that the tool files, `tests/fixtures/tool-records.js` (`withRequestedLevel`) and the six loader functions of
  `tests/replay-fixtures.js` are identical (its other change is comments and the `HEADER` text of the wire fixture); and that no
  engine, variant or core file mentions `SG.store`, `storedAttempts` or `localStorage`. The exception applies; no
  MEGA-REFRESH was needed.
- *Manual results (IR08).* `gd/manual-compatibility.json` (script `manual-compat.cjs`): the 186 results carry one fingerprint
  `c3035e80…`; the fingerprint now is `d33389ac…`; of its 167 files 18 differ (6 documents, 5 quick suites, 3 published data
  fixtures, 3 recorder or tool scripts, and `store.js`), none added or removed; the manual suites, the corpus helper and every
  engine, variant and core source are identical; a scan finds no use of the store or of the changed fixtures by any selected
  manual code. The 186 are retained, not rerun: 167 pass and 19 are failed availability assertions, exactly as b3 recorded
  them, and the `slot: none` times stay unprotected descriptions (IR07).

- *Rechecked after the R6B-F01 fix (test-only change).* The fix changed two Generator quick suites (`history.test.js`,
  `cache.test.js`) and nothing else hashed: the Generator quick fingerprint went from `bee132a8…` to `7d3102d3…` (the file lists
  differ in exactly those two files; test names and ordinals are identical), the Player fingerprint stayed `1d0724c3…`, and the
  manual-suite fingerprint went from `d33389ac…` to `549646ee…`. `deep/reconciled-final.json` is the same reconciliation
  (`currentMatches` `{ sourceHash: false, toolHash: true }`, 14 of 14, 6 of 6 relations) and `deep/compatibility-final.json` (a fresh
  read-only snapshot comparison, `deep/snapshot-diff-final.json`) the same exact-diff proof: the working-tree engine hash is still
  `a073f9bd…`, `store.js` is still the only changed source. `gd/manual-compatibility-final.json`: b3's 186 results (`c3035e80…`)
  against the new fingerprint, 20 of 167 files differ (7 quick suites, 6 documents, 3 published data fixtures, 3 recorder or tool
  scripts, `store.js`), none added or removed, and the executed code is unchanged, so they are retained with their original
  hashes and statuses. `gd/gd-compatibility-final.json`: the 22 classic9 GD results (`d33389ac…`) against `549646ee…`: exactly 2 files
  differ, both quick suites, nothing runtime. E: the three merge checks pass again (`logs/e4`-`e6`).

## 6. Coverage notes carried to MS18e (IR13)

| Pin | Coverage after r6a (unchanged here) |
|---|---|
| P03 / P09 | multi-move jump specimens 3 to 2 (G11, G12); the changed G06 is no longer that branch |
| P04 | view-dependent jump specimens 3 to 2; the signed details change is asserted for G11 (-5) and G12 (-4) |
| P06 | new hardest technique at a flat or lower score: 3 to 2 (G13 flat, G11 fall) |
| P12 / IR11 | the reveal fold has one specimen, G11 (peak 1,967); the search covered the 14 goldens, the guides' example and the player suite's 11 other fixed real results, and found none: **MS05r6a-COV01 for MS18e** |

All the tests that carry these notes passed in the final run (`steps` 57, `replay` 153, `player` 69). Passing is not a claim
that the earlier specimen counts were preserved.

## 7. Findings

| Id | Severity | Finding |
|---|---|---|
| R6B-F01 | **Resolved** | `generator/i18n/9` (`i18n > i18n: locale fragments > has no key defined twice …`) failed in the first Generator run when `history` or `cache` ran before `i18n` in one process: the private `startApp()` copies of `js/ui/app.js` in `history.test.js` and `cache.test.js` shared `SG.localeFragments` (via `Object.assign({}, SG)`) and pushed the app fragment a second time (162 conflicts); `i18n` alone passed, `history,i18n` and `cache,i18n` failed (`quick/diag/`). SA2 decided (a): MS05r5p's fix round gave each private copy its own `sg.localeFragments = []` and asserts that the host list is unchanged (`MS05r5p/evidence.md`, "R6B-F01 fix": `history,cache,i18n` 203 of 203, `store,controls,help,ui-contract` 228 of 228). Every Generator shard was then run again on the new fingerprint `7d3102d3…`: 3,262 of 3,262 passed, `i18n` 83 of 83 (`quick-final/`). Nothing was hidden or reordered, and r6b edited no test |
| R6B-F02 | Informational | IR13 names three additions and seven renames, but the migration also finds three more one-to-one renames in `replay-recorders` (`#1`, `#16`, `#38`: the four wire requests G09-G12 became five, G09-G13, by MS05r6a A0). Total: 3,207 old tests = 3,197 unchanged + 10 renamed; 55 added (46 `manual-corpus`, 6 `store`, 3 G13 spies); final 3,262. MS05r6c selectors use the final names |
| R6B-F03 | Informational (first run only) | `docs/difficulty-v3/evidence/MS05r6b/runs.jsonl` has no helper seconds for the first run's compound `c3` (my logger threw on its nonzero exit before it kept the summary line): its process time is derived (wall seconds minus 0.102 s) and flagged in `standing-quick-cost.json` (history); the final run has no derived figure; the driver's own elapsed time (178.087 s) and both children's times are recorded |
