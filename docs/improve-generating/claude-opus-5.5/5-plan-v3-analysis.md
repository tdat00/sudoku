# Plan version 3 (Sudoku): analysis, phase 1

Analyst: Opus (claude-opus-5.5), 2026-11-15. Independent phase-1 analysis; Astra's new file was not read.

**Basis.**

- `plan.md` at `2278b61` (version 3, 494 lines) and `clarifications.md` at `2278b61`: the answers IG-S-Q19 to
  IG-S-Q25, the positions and decisions IG-S-D1 to IG-S-D6, and "Plan version 3".
- `plan-v2-joint-report.md` (the joint report on version 2, JV2-S01 to JV2-S16), the reference for fidelity.
- Evidence: R3 (`evidence/phase0/provisional-r1/report-r3.md`), the smoke report r2, and Q (the MS07e checkpoint),
  as cited by the plan.
- Source: `rating-v3` at `75b99e6`, read with `git show` only; the main working tree was not opened.
- Nothing was run.

**Labels.** *Measured*: a committed record. *Derived*: arithmetic on records, or a reading of the source's
control flow. *Analysis*: judgement. Severity: **High** blocks a phase or a decision; **Medium** changes a
number, a stage or a statement that the design or the owner acts on; **Low** is local wording or a pointer.

## Summary

- **Fidelity (A).** Version 3 takes in JV2-S01 to JV2-S16, the joint report's answers, candidate table, speed
  table and F0 to F6 scope, the seven plan-author answers and the six owner decisions. Four items are partly
  taken in, all minor:
  - the 375-point statement that IG-S-Q21's answer promised;
  - JV2-S15's propagation note;
  - two details of the joint report's F0 and F2 rows.
- **New findings (B):** 0 High, 1 Medium, 6 Low.
  - The Medium one: the 20-or-more confirmation cohorts sit outside the F0 to F6 sequence, with no arms
    named. Most of the round's machine time depends on them.
  - The one arithmetic slip in section 4: butterfly Hell 1, a four-attempt board, is priced with the
    two-attempt factor.
- **Checked against `75b99e6` and correct:** every source anchor of sections 2 to 3 (listed under B).
- **Speed (C).** Section 4 matches the evidence except butterfly Hell 1: its scenario is 11.2 to 19.1 s, not
  19.5 to 23.8 s. No measured number has moved. MS08a (Skyscraper) has landed since Q, so the baseline is one
  finder behind; F1 absorbs that.
- **Questions (D):** IG-S-Q26. No new owner decision.
- **Pruning (E):**
  - delete `plan-v2-joint-report.md` and the v2-round analyst files after the v3 joint report, with four link
    fixes;
  - keep `report.md` (R3's errata cite its lines), the v1-round analyst files, `clarifications.md`,
    `evidence/` and the task pack;
  - cut about 28 lines of version narration from `plan.md`, section 0 included.

## A. Fidelity

Status: **in** (taken in), **partly**, **missing**, **changed** (taken in with a changed meaning). Lines are
`plan.md` at `2278b61`.

### A.1 The joint report's corrections (JV2-S01 to JV2-S16)

| ID | Correction | Status | v3 line | Note |
|---|---|---|---|---|
| JV2-S01 | "up to 1.6x CPU" is not a bound: 0.98 to 1.58, early pairs 4.39 and 4.13, cohort 1.67 | in | 42, 152, 482 | |
| JV2-S02 | partial S3: cell medians 0.91 to 1.02, pairs 0.89 to 1.04 | in | 154 | |
| JV2-S03 | full S3 and S4 were never built | in | 154 | |
| JV2-S04 | the band did not widen from 220 to 590 | partly | 51-52 | the band is stated; the 375-point change that IG-S-Q21's answer promised is absent (JV3-S04) |
| JV2-S05 | the 1,296 and "10 times" costing retired | in | 52-53, 158 | |
| JV2-S06 | capacity `min(4, A)` | in | 151, 227 | |
| JV2-S07 | S6 needs a validated checkpoint; an initial full-grid timeout has none | in | 187, 246-251 | |
| JV2-S08 | smoke: three textual failures, a stale exposure, two suites timed out, no parity | in | 337-341 | |
| JV2-S09 | Q: 129 of 135 cells, 4,311 requests, no live offer | in | 89-93 | |
| JV2-S10 | mega16 Expert: p95 9.69 s against 30 s; the hit rate at the threshold | in | 113-114 | |
| JV2-S11 | Greater-Than Expert added; mega16 Nightmare not qualified | in | 106 | |
| JV2-S12 | Killer Nightmare's p95 is an exact request; S5b needs consumed samples | in | 134-135, 192, 287, 324-325 | |
| JV2-S13 | S-OD7 covers Killer Hard and Expert only | in | 72-73, 107-108 | |
| JV2-S14 | no bank before the final catalogue | in | 50, 196, 288, 399-410 | |
| JV2-S15 | K5 already present; guard equivalence includes propagation checks; stronger shared propagation can change Nishio findings | partly | 172-173, 200 | the last clause is not carried (JV3-S08) |
| JV2-S16 | early architecture establishes neither speed nor CPU, and authorises no SM5 | in | 241-242 | |

### A.2 The joint report's other positions

| Item | Status | v3 line | Note |
|---|---|---|---|
| verdict: selective S5a, retire S1, S2 and the sweep, keep S6 and S7, K2 and K4 conditional, no bankable multiplier | in | 37-50, 185-205 | |
| what the cross-review settled: K5, K2, K4, pool factors, Killer Nightmare, telemetry, harness | in | 134, 186, 190-191, 200, 337-341, 368-372 | |
| Q1 targets and Q2 over-budget table | in | 99-135 | |
| Q3 K1 and K2; Q4 K4 | in | 198, 269-279 | |
| Q5 retirement; Q6 Hell 1 and Killer reach | in | 39-40, 193, 283-284, 320-328, 353-355 | |
| candidate table | in | 183-205 | S2 "park with S1" merged into "dropped from the mandatory scope", with the reopening conditions at 283; equivalent |
| speed table | in | 300-318 | carries the butterfly slip (JV3-S01) |
| F0 to F6 | partly | 343-351 | F0 drops "recheck transforms"; F2's stop condition drops "state the outer concurrency, warm or cold policy and early-hit scheduling" (JV3-S05) |
| 20 or more paired confirmation requests as a costed proposal | in | 374-379 | not placed in F0 to F6 (JV3-S02) |
| the budget enumeration; no carried allocation | in | 333-335, 381-382 | |

### A.3 The plan-author answers

| Answer | Status | v3 line | Note |
|---|---|---|---|
| IG-S-Q19: intrinsic against generator-only contract; inseparable sites stay on the reference scan | in | 163-176 | |
| IG-S-Q20: per-target paired ready wall; 1.5 and 1.15; controls at 0.95; order; admission | in | 384-397 | adds the overhead `u` to the formula, which is consistent |
| IG-S-Q21: remove 220 and 590; state the band and the 375-point change, labelled Derived | partly | 51-52 | the 375-point change is absent |
| IG-S-Q22: inner width four at outer `--jobs=1`; throughput studies apart | in | 357-364 | |
| IG-S-Q23: (a) first; K4 decides between (b) and (c) | in | 399-410 | |
| IG-S-Q24: fields, reuse rule, the proposed cohort cells | in | 366-379 | |
| IG-S-Q25: no preliminary SM5 | in | 241-242, 453 | |

### A.4 The owner decisions

| Decision | Status | v3 line |
|---|---|---|
| IG-S-D1: selective pool, early-hit path, serial fallback, enablement after frozen results, phone check | in | 41-42, 217-242, 417, 448 |
| IG-S-D2: narrowed repair after MS18e, actual parity, no old-engine fallback, priced afterwards | in | 333-341, 449 |
| IG-S-D3: Hell 1 diagnosed first, unoffered; no bank before the final catalogue | in | 50, 399-410, 450 |
| IG-S-D4: inner width four at outer `--jobs=1` | in | 49, 357-364, 451 |
| IG-S-D5: reduced staged round F0 to F6; the screen and the sweep retired | in | 48-49, 331-355, 452 |
| IG-S-D6: no preliminary width sweep | in | 241-242, 453 |

## B. New or remaining issues

| ID | Kind | Severity | v3 line | Finding | Proposed fix |
|---|---|---|---|---|---|
| JV3-S01 | Derived | Low | 316 | Butterfly has 144 cells (`classic-model.js:101`), so `defaultMaxAttempts` gives it four attempts, not two (`digger.js:622-634`: up to 81 cells 8, up to 144 cells 4, more 2). Its Hell 1 scenario uses the two-attempt factor 1.66 to 1.96 (19.5 to 23.8 s); mega12, also 144 cells, uses 2.07 to 3.43. The slip is inherited from the joint report | 38.3 / 3.43 to 39.5 / 2.07: **11.2 to 19.1 s**. Under the 30 s budget either way; no decision depends on it |
| JV3-S02 | Analysis | Medium | 343-351, 374-382 | The confirmation cohorts (20 or more paired requests on up to six cells, plus two controls) appear in 5.3 but in no F step. Their arms are not named: F2 lists native and widths 1, 2 and 4, while "paired" suggests width four against width one. They are most of the round's machine time: about 0.7 h as width-4/width-1 pairs, about 1.4 h at four arms, and about twice that if every request took its cell's p95 (basis below) | Place the cohorts, as part of F2 or as a step after F5 before F6, name their arms, and say whether F2's widths 1, 2 and 4 run on the same seeds (IG-S-Q26) |
| JV3-S03 | Fact | Low | 87-97, 476 | MS08a (`89350b8`) has landed: Skyscraper (fish group, order 112, weight 330, Hard tier, Expert-and-above floor). E: 66 of 520 regression hashes, four reference ratings moved, no level change. Q is now one finder behind `rating-v3`; the plan's general statements remain true | Name MS08a in 2.1 as the first of the about 14 finders, so that F1 reconciles from it |
| JV3-S04 | Fact | Low | 51-52 | IG-S-Q21's answer says version 3 "states the unchanged band and the 375-point change of the one-step lower bound, labelled Derived"; only the band is stated | Add the 375-point sentence where the band is stated (see E.2) |
| JV3-S05 | Analysis | Low | 345, 347 | From the joint report's F0, "recheck transforms" is dropped; from F2's stop condition, "state the actual outer concurrency, the warm or cold policy and the early-hit scheduling" is dropped. 5.2 covers the outer concurrency, but not the warm or cold policy or the per-cell early-hit choice | Restore both clauses |
| JV3-S06 | Analysis | Low | 76-77, 227, 360 | "Workers with message passing are fine" sits beside the rule that `file://` runs the main-thread lane, and the IG-S-Q02 caveat | "fine when the page is served over http(s); under `file://` the one main-thread lane" |
| JV3-S07 | Derived | Low | 390-397 | 5.4 gives the profile admission for 1.5 only. For K2's threshold of 1.15, `1/(1 - f + f/s) >= 1.15` needs `f >= 0.13` even for an unbounded `s`, and `f >= 0.72` at K2's favourable kernel factor 1.22. Its own example (`f` 0.8, about 1.17) passes narrowly | State the K2 case, so that F3 can refuse K2 early when the eligible share is under about 0.7 |
| JV3-S08 | Analysis | Low | 200 | JV2-S15's "stronger shared propagation can change canonical Nishio findings" is not carried. It is what makes any reopened K5-like idea an intrinsic change under 3.1 | One clause in the K5 row or in 3.1 |

**Basis of JV3-S02 (Derived).** Typical per-request times are taken from Q, the medians and the over-budget
counts:

| Cell | Typical time | Over budget | p95 (the upper case) |
|---|---|---|---|
| Greater-Than Master | about 2 s (median 0.74 s) | 4 of 40 | 14.5 s |
| Killer Nightmare | about 8 s | 8 of 24 | 24.9 s |
| Killer Master | about 13 s | 8 of 13 | 22.8 s |
| diagonalX Hell 1 | about 18 s | 9 of 9 | 25.9 s |
| samurai Hell 1 | about 28 s | 6 of 14 | 37.9 s |
| mega16 Nightmare | 11.8 s (pilot mean) | | 26.5 s |

The typical times sum to about 81 s per seed across the six cells, and the p95s to 152.5 s.

- A pooled arm takes about 0.4 to 0.6 of the serial time. Twenty width-4/width-1 pairs then take about
  `20 x 1.5 x 81 s`, or 0.7 h; native, 1, 2 and 4 take about `20 x 3 x 81 s`, or 1.4 h.
- F3 to F5 (small named cohorts, instrumented): about 0.5 to 1.5 h.
- F0 to F5 then total about 2 to 4 h of machine time, before validation, startup and wrapper grace. The
  repair itself is development time.

**Checked against `75b99e6` and correct (no finding):**

- `digger.generateSteps:2060-2184` leaves its outer loop only on an exact result (`:2176`).
- `pipeline.js:253-266` returns `attempts`, `timings` and `work`.
- `killer.js:907-913` counts uniqueness for closer keeper offers.
- `removalObjective` is at `digger.js:689` and `difficulty.certifyFloor` at `:412`.
- `full-grid.js:243-260` runs without a backtrack limit from `maxRestarts` (`DEFAULT_MAX_RESTARTS` 50).
- `worker-client.js:120` creates one `Worker`.
- `refutes` (`tech-chain.js:643-653`) reuses a buffer per depth, calls `ctx.check()`, tests its cap, then
  counts work.
- The size defaults are 8, 4 and 2.

## C. Speed before and after

The baseline of section 4 is Q (MS07e on the MS07d runtime, outer `--jobs=4`). The sensitivities are R3's old
pool factors: 2.07 to 3.43 for four and eight attempts, 1.66 to 1.96 for two, and 2.07 to 2.65 for Killer. I
recomputed every phase-1 cell: they divide Q's p95 or pilot times by those factors, and all match except
butterfly Hell 1.

| Cell (section 4) | Recomputation | Status |
|---|---|---|
| classic9 and wordoku Hell 1: 2.4 to 3.9 | 8.069 / 3.43 = 2.35; 8.069 / 2.07 = 3.90 | matches |
| hyper, Jigsaw, diagonalX Hell 1: 3.8-6.3, 4.5-7.5, 7.6-12.5 | 13.111, 15.498, 25.909 divided by 3.43 and by 2.07 | matches |
| Killer Hell 1: 19.0 to 24.3 | 50.222 / 2.65 and / 2.07 | matches |
| Killer Hard p95 2.5 to 3.2; Expert 3.8 to 8.6 | 6.578 / 2.65 and / 2.07; 17.773 / 2.07 = 8.59 | matches |
| Killer Master 4.2 to 11.0; Nightmare 9.4 to 24.9 | 22.781 / 2.07 = 11.0; 24.903 / 2.65 = 9.40, or unchanged if the exact hit came first | matches |
| Greater-Than Master 5.5 to 14.5 | 14.478 / 2.62 (Greater-Than's pair factor), or unchanged | matches |
| samurai, sohei, flower Hell 1 (two attempts) | 37.925, 33.126, 27.429 divided by 1.96 and by 1.66 | matches |
| mega12 and Greater-Than Hell 1 | 36.5 / 3.43 to / 2.07 = 10.6 to 17.6; 37.6 / 3.43 to 40.1 / 2.07 = 11.0 to 19.4 | matches |
| mega16 Nightmare (two attempts): 6 to 12 | 11.8 / 1.96 = 6.0 | matches |
| **butterfly Hell 1: 19.5 to 23.8** | four attempts: 38.3 / 3.43 to 39.5 / 2.07 | **corrected: 11.2 to 19.1** |

No measured number has moved since my version 2 speed table. Version 3 uses the joint values, which replace my
version 2 rows for Killer Nightmare ("misses 5.4 to 11.2 s"), mega16 Nightmare ("at most about 14 s") and
mega16 Hell 1 ("over 60 s"); I withdraw those rows. Availability is unchanged, as version 3 says: a
same-result pool keeps every exact flag, and no cell becomes offerable on these numbers.

## D. Questions and decisions

**IG-S-Q26. Where the confirmation cohorts run, and with which arms.**

- *Question.* 5.3 proposes 20 or more independent paired requests on up to six cells after F1, but no F step
  holds them, and F2 lists native and widths 1, 2 and 4. Are the cohorts F2's population or a later step?
  Which arms do they run: width 4 against width 1 only, or all four?
- *Why it matters.* They are most of the round's machine time (JV3-S02), and the manifest is priced after
  the repair.
- *Options.* (a) The cohorts are F2: all four arms on the 20 seeds of each target cell, with fewer seeds on
  the early-hit controls. (b) F2 runs four arms on a small set (five seeds per cell); the cohorts follow F5 as
  width-4/width-1 pairs only. (c) The cohorts come only after F6, for admitted prototypes.
- *Recommendation.* (b): the widths sweep needs few seeds to choose the per-cell early-hit policy, and the
  pairs then confirm it on 20.

**Owner decisions.** None new. Section 7's "Still to come" list is complete; Q26 feeds the manifest's price.

## E. Pruning proposal

### E.1 Companion files

| File | Proposal | Reason |
|---|---|---|
| `report.md` (the v1 joint report) | keep; add a one-line banner: "superseded by `plan.md` version 3; errata E1 to E10 in `evidence/phase0/provisional-r1/report-r3.md`" | R3's errata E1, E3 and E4 cite its lines (E1: "report.md (joint report): 49, 64, 92-95"), and `report-r3.json` names it as the source of the estimates. A measured record depends on it |
| `plan-v2-joint-report.md` | delete once the v3 joint report exists | version 3 takes in JV2-S01 to JV2-S16, the answers, the candidate table, the speed table and F0 to F6 (A.1, A.2), and the decisions are in `clarifications.md`. Its links: `plan.md:5` and `clarifications.md:621, 887`, each to become "`plan-v2-joint-report.md` at `21da9c2`" |
| `claude-opus-5.5/` and `gpt-6-astra/` 1-* and 2-* (the v1 round) | keep | they are the basis of `report.md`, which is kept; the provisional round's firewall snapshots list them; deleting them saves little |
| `claude-opus-5.5/` and `gpt-6-astra/` 3-* and 4-* (the v2 round) | delete with `plan-v2-joint-report.md` | superseded by the joint report and version 3. Cited only by the joint report and by each other. `clarifications.md:621-622` ("the local Q19+ lists in the analyst files, which remain unchanged") gets "at `21da9c2`" |
| `clarifications.md` | keep every section | it is the decision log. The cover note (564) and the "Plan version 2" summary (597) are dated records. No trim |
| `evidence/` | keep all | no working draft. The r1 and r2 reports, and their `coverage`, `gate`, `budget-summary` and `frozen-rerun-plan` siblings, are superseded generations, but R3's errata and the IG-S10 ledger cite them. `frozen-rerun-plan*.json` is the old full manifest that IG-S-D5 retired: a record, not a basis (version 3, 353-355). The smoke's r1 report stays beside r2 |
| `tasks/improve-generating/*` | keep | the executed pack and its check-list; R3's estimate table and the IG-S10 handoff cite them |

### E.2 Version 1 and version 2 remnants in `plan.md` (version 3)

| Lines | Text | Proposal |
|---|---|---|
| 3-9 | "Version 2 with its section 9 addendum is this file at ... merged into the sections they belong to" | replace by one line: "Earlier versions: 2 at `adb7184` (which keeps the mechanism text of the parked and dropped items), 1 at `1437774`; the change record is in `clarifications.md`, 'Plan version 3'". Keep lines 11-17 |
| 35-55 | section 0, "What version 3 changes" | delete. Each item is in the body (1: 99-114; 2: 193, 283-284; 3: 217-242; 4: 186-200; 5: 163-176; 6: 384-397; 7: 331-364; 8: 399-410). Move item 9's one live fact to 2.1: "The Nightmare band is `[1500, 2400)` before and after MS07; the one-step lower bound moved by 375 points (Derived)" |
| 158 | "the 1,296 figure is retired" | "old source; a per-sample cost input only" |
| 471-472 | "The phrase about a widened window in the answer to IG-S-Q08 is withdrawn (IG-S-Q21)." | delete; `clarifications.md` records it under IG-S-Q21 |

Kept on purpose: 2.5 (the old measurements, and what each still supports), 3.8 (the reopening conditions),
7's list of superseded answers (467-471), and lines 11-13 (why version 3 is smaller).

Net: about 28 of 494 lines. The link fix at line 5 follows the deletion of `plan-v2-joint-report.md`.
