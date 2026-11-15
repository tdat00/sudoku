# Plan version 3 (Sudoku): cross-review of Astra's analysis

Opus (claude-opus-5.5), 2026-11-15, phase 2.

**Reviewed:** `gpt-6-astra/5-plan-v3-analysis.md` (285 lines), against my
`claude-opus-5.5/5-plan-v3-analysis.md`, `plan.md` at `2278b61`, the records, and `rating-v3` at `75b99e6`
(read with `git show` only). Nothing was run.

## Summary

- **Astra's four findings.** I agree with three and agree with a change of severity on one (JV3-S03, Medium
  to Low). I verified each against `75b99e6` or the checkpoint (section 1).
- **One disagreement.** Astra's section C says that all seventeen rows of section 4 reproduce the evidence.
  Butterfly Hell 1 does not: it is a four-attempt board, priced with the two-attempt factor (section 3).
- **Fidelity.** I accept three of Astra's readings and withdraw three of my Low findings:
  - JV2-S04: the 375-point sentence is not needed by any rule;
  - JV2-S15: rule 3.1 already forbids changed findings;
  - F0 and F2: the repair text and 3.4 cover the dropped clauses.
- **Questions (section 4).** Two remain: IG-S-Q26 (the confirmation cohorts) and IG-S-Q27 (Astra's kernel
  control and CPU rule).
- **Pruning (section 5).** I change three positions:
  - keep `plan-v2-joint-report.md`;
  - keep the 3-* and 4-* files;
  - delete both `1-speed-summary.md`.

  I withdraw the `report.md` banner (`ig10-test.cjs` asserts its line numbers), and I accept Astra's deletion
  of `plan.md:11-13`. I decline the trims of `clarifications.md`.

## 1. Astra's findings

| Astra | Verdict | Evidence and change |
|---|---|---|
| JV3-S01 Low: the controls sentence includes failing small-board cells | **agree** | `75b99e6:docs/difficulty-v3/qualification-checkpoint-2026-11-15.md:32-33`: classic4 Nightmare 0/14, classic6 Nightmare 4/18. `plan.md:103` ("the other executed non-Killer cells pass") needs "real-tier", or the cells named |
| JV3-S02 Medium: outcome reuse needs the timeout exception | **agree** | `75b99e6:generator/tests/qualify.js:19-20`: "Timeouts, errors, approximate and unrated results are misses". A request that timed out at the 120 s guard among four concurrent requests may complete alone, so only completed, uncensored outcomes carry over between concurrency protocols (`plan.md:362-363` and 5.3) |
| JV3-S03 Medium: the kernel regression and CPU rule is not determined | **agree, with a change: Low** | The CPU statistic is indeed unnamed, and 0.95 needs a scope against the serial rule of S5a (`plan.md:239-240`). But 5.4's own order rule (`plan.md:394`) already defers naming "targets, controls and the statistic" until after F3 and before evaluation. The fix is to name the CPU statistic and the tolerance's scope in that same step (IG-S-Q27) |
| JV3-S04 Low: the Q and chain-window citations are not in the branch | **agree** | Confirmed: `docs/difficulty-v3/qualification-checkpoint-2026-11-15.md`, `chain-window-2026-11-15.md` and `evidence/MS07e/` are absent at `2278b61`. Pin `plan.md:31-32` and `:97` to "at `75b99e6`"; this is a link fix, agreed in section 5 |
| Section C: "all seventeen rows ... no substantive number movement" | **disagree for one row** | See section 3 |

Astra's other checks are agreed:

- The Amdahl bounds of 5.4.
- K2 at x2 needs about 26.1 % (mine: 72 % at its favourable kernel factor 1.22). The two are consistent.
- S7's total budget across restarts.
- The Killer Expert endpoint is 3.865 s rather than 3.8, which is immaterial.

## 2. Fidelity: where our tables differ

| Item | Opus | Astra | Joint position |
|---|---|---|---|
| JV2-S04 (220 to 590) | partly: the 375-point sentence promised by IG-S-Q21 is absent | in | **in.** No rule uses that sentence; adding it back would be history. I withdraw my JV3-S04 |
| JV2-S15 (K5; stronger propagation) | partly | in | **in.** 3.1's intrinsic contract already forbids a change of canonical findings. I withdraw my JV3-S08 |
| F0 ("recheck transforms") and F2 (warm or cold policy, early-hit scheduling) | partly | in | **in.** The repair text (`plan.md:337-341`) covers the adapters' transforms, and 3.4 and 5.2 cover the early-hit choice and the timing kinds. I withdraw my JV3-S05 |
| 9.5 Q1 targets; Q6 and F1 outcome reuse | in | partly | **partly**: Astra's JV3-S01 and JV3-S02 |

## 3. My findings that Astra did not raise

| ID | Severity | Finding (evidence) |
|---|---|---|
| JV3-S01 | Low | Butterfly has 144 cells (`75b99e6:core/js/engine/classic-model.js:101`). `defaultMaxAttempts` gives 4 attempts up to 144 cells (`generator/js/engine/digger.js:628-634`; the qualifier states it at `qualify.js:21-22`). Section 4 (`plan.md:316`) prices butterfly Hell 1 with the two-attempt factor, giving 19.5 to 23.8 s, while mega12, also 144 cells, uses 2.07 to 3.43. Corrected: 38.3 / 3.43 to 39.5 / 2.07 = **11.2 to 19.1 s**. The slip is inherited from the joint report on version 2; no decision depends on it |
| JV3-S02 | Medium | The 20-or-more confirmation cohorts (5.3) sit in no F step, and their arms are not named; they are most of the round's machine time. Astra's A5 reads them as F2's, which version 3 does not say. Indication: about 2 to 4 h of machine time for F0 to F5 (Derived from Q's medians and p95). IG-S-Q26 |
| JV3-S03 | Low | MS08a (`89350b8`) has landed: Skyscraper. E: 66 of 520 regression hashes, four reference ratings moved, no level change. Q is one finder behind, so name MS08a in 2.1 for F1's reconciliation |
| JV3-S06 | Low | "Workers with message passing are fine" (`plan.md:76-77`) sits beside the `file://` main-thread lane (`plan.md:227, 360`). Say "when served over http(s)" |
| JV3-S07 | Low | 5.4 states the profile admission for 1.5 only. For K2's 1.15 it should state `f >= 0.13` for any `s`, `f >= 0.26` at `s` = 2 (Astra) and `f >= 0.72` at `s` = 1.22 |

## 4. Questions for Fable: one list

| Proposed ID | Question | From | Status after version 3 |
|---|---|---|---|
| IG-S-Q26 | Where do the 20-or-more confirmation cohorts run in F0 to F6, and with which arms? (a) As F2's population, all four arms on 20 seeds. (b) After F5, as width-4/width-1 pairs only, with F2's widths 1, 2 and 4 on about five seeds per cell. (c) After F6, for admitted prototypes only. Recommendation: (b) | Opus | open; the manifest's main price driver |
| IG-S-Q27 | For the kernel gate, does 0.95 on named controls replace the strict serial non-regression of S5a (`plan.md:239-240`) for phase 3? Which per-cell CPU statistic and threshold bind "CPU may not rise": the paired geometric mean, cohort totals or a bound? Recommendation: state the scope now, and name the CPU statistic with the targets after F3 (`plan.md:394`) | Astra's IG-S-Q26 | open, but small; it can be answered in one line |

Corrections for the joint report, not questions:

- butterfly Hell 1's attempt class;
- outcome reuse only for completed, uncensored requests (Astra's JV3-S02);
- "real-tier" in the controls sentence (Astra's JV3-S01);
- MS08a in 2.1;
- the `file://` wording;
- K2's admission bounds.

## 5. Pruning: final positions

The orchestrator executes only the rows marked **agreed**.

| Item | Opus phase 1 | Astra | Opus final | Reason |
|---|---|---|---|---|
| `report.md` | keep, with a banner | keep; pin its reader's links | **keep; pin the links in place, no banner (agreed)** | `report.md:5` ("Plan") becomes "`plan.md` at `1437774`". `:8` (the speed-summary links) becomes "at `2278b61`". No added line: `generator/tests/artifacts/improve-generating/phase0/ig10-test.cjs:740-748` asserts `report.md` lines 35, 36, 64, 65 and 108, and `reconcile-errata.cjs` locates its passages by pattern |
| `plan-v2-joint-report.md` | delete | keep | **keep (changed)** | The decision log cites it for the option texts and evidence the owner decided on: `clarifications.md:621` and `:887`, and Fable's "the report's JV2-S14" under IG-S-Q23. It is the round's review record, not a plan remnant |
| 3-* and 4-* (both analysts) | delete | keep | **keep (changed)** | They are the joint report's stated basis, and they hold source checks that version 3 does not repeat |
| `1-speed-summary.md` (both analysts) | keep | delete after link fixes | **delete (agreed)** | Superseded duplicate tables, with no binding content. In-place pins on three lines: `report.md:8`, `claude-opus-5.5/2-cross-review.md:4` and `gpt-6-astra/2-cross-review.md:5`, each to "at `2278b61`". The evidence firewall inventories that list the names stay unchanged: they record the tree at the run |
| `1-analysis.md`, `2-cross-review.md` | keep | keep | **keep (agreed)** | Basis of the kept `report.md` |
| `clarifications.md` | keep all | trim 528-547 and 597-615 | **no edit (declined)** | It is the decision log. The two sections are dated and flagged by their dates; the orchestrator's rule requires a strong reason, and staleness is not one. No link in it needs a pin while the joint report stays |
| `evidence/`, `tasks/improve-generating/*` | keep | keep | **keep (agreed)** | Records. The r1 and r2 reports and `frozen-rerun-plan*.json` are cited by R3's errata and the IG-S10 ledger |
| `plan.md` 3-9 | trim | trim | **trim (agreed)**: delete "It is written as one current document: the layered ... belong to." (7-9); keep the commit pins, the links and "The full mechanism text ... stays in version 2" | Pure history |
| `plan.md` 11-13 | keep | delete | **delete (agreed, changed)**, with one of the blockquote's empty lines (10 or 14) | Retargeting history that duplicates 1 and 2.2; it also states the incorrect "Nightmare cells ... pass" (Astra's JV3-S01) |
| `plan.md` 35-55 (section 0) | delete, moving the band sentence to 2.1 | delete or a three-line overview | **delete (agreed)**; my move of the band sentence is withdrawn | A change log; every item recurs in the body, and no line refers to section 0 |
| `plan.md` 31-32, 97 | - | pin at `75b99e6` | **link fix (agreed)** | Astra's JV3-S04 |
| `plan.md` 158, 471-472 | reword or delete | keep | **withdrawn** | Not worth an unagreed edit |
| `plan.md` 474-494 | keep | "trim repetition only" | **keep (declined)** | No exact lines are proposed, and the risks are current |

Net agreed: delete two files (`1-speed-summary.md`, both analysts). Pin links in place: `report.md:5` and `:8`,
the two 2-* mentions, and `plan.md:31-32` and `:97`. Cut about 30 lines of `plan.md` (3-9 in part, 10-13,
35-55).
