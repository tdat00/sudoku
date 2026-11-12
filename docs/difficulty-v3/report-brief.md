# Rating v3 — brief report

| | |
|---|---|
| Date | 2026-11-12, 06:47–11:10 (local time, +07:00) |
| Who | orchestrator: GitHub Copilot CLI / Claude Opus 5.5 · analysts: **claude-opus-5.5** and **gpt-6-astra** (both max reasoning, long context) · plan author: **claude-fable-5-2** · later implementers: **claude-sonnet-5.5** sub-agents |
| Code examined | `6abcb9f`, branch `rating-v3`; clarification answers committed as `1398dde` |
| State | **analysis done, awaiting acceptance; no code changed**. Signed by both analysts (SA1's check: `claude-opus-5.5/5-check-of-final-report.md`). Awaiting acceptance by the owner and the plan author; AC01 remains open in `clarifications.md` Part F. Task-pack work and implementation remain paused. |
| Details | [`report-detailed.md`](report-detailed.md): verified findings, corrected specification R1–R24, planned tasks, gates, evidence and acceptance concern |

## What was asked

Make **Hard really hard**: an exact result must need its level's techniques, not just reach its score band
through many easier steps. Spread generation across the band, correct the technique order, add the missing
solving patterns and publish the changes together as rating version 3.

The full Sudoku plan is in scope: S0–S3, all six S3 groups and S2.3. Two analysts independently checked the
plan against the code, cross-reviewed their reports and responses, then wrote and checked a joint report.
The owner asked for the author's answers to be applied before accepting any further task-pack work.

## Result in brief

- **The score formula stays:** `round(80·E/(E+40) + P + 0.25·P·log₂(1 + W/P))`, with the work term zero
  when P is zero. E is the starting empty-cell count, P the highest weight used and W the weighted work.
  Existing weights and nine band edges stay; the new IDs use the fixed priors, not fixture-fitted weights.
- **Exact means solved, in band and required.** A level's floor is the preceding level's allowed techniques;
  its tier is the difference. Requiredness comes from the complete canonical rating after the order fix;
  a restricted floor solve remains the independent reference, not a second production solve.
- **Shallow is honest, not exact:** an in-band puzzle solvable below its tier gets both approximate and shallow
  warnings and a new replay explanation. VeryEasy and empty tiers are explicitly vacuous; Easy is not.
- **One target per sample** passes through guided digging, refinement and local search. It is uniform on the
  raw band; exactness has priority, caps stay and the generator still stops at its first exact outer result.
  Reports show raw and analytic attainable-range positions, not just a misleading raw-band median.
- **The shared solver grows to 40 IDs:** new fish patterns, remote pairs, WXYZ-Wing, BUG+1, XY-chain,
  Jigsaw leftovers and ALS rules; extended Unique Rectangle and grouped-chain proofs. Player hints name and
  explain them. Orders become cageCombo 44, ineqChain 46 and jellyfish 137; forcingChainLong is 198.
- **Chains and Nishio get distinct IDs:** short/long chains split at a measured cutoff of 4 or 6 links,
  with long ending at 12; Nishio is depth 1, deep Nishio defaults to 2, with 3 only on explicit request.
- **Rating/cache become version 3; history remains store version 1.** New history entries record the rating
  version; older entries truthfully say “made by an earlier version”. No floor certificate is exported.

The diagnosis is narrower than the plan's first description: classic9 Hard was already required in 24/24
sampled puzzles and only 3/24 were in its top quarter. Expert had 9/12 in the top quarter, partly because
its lowest tier technique already contributes 812.5 points before empty cells. Normal, Master, Nightmare
and several variants had shallow results. On twelve old Nightmare boards, cutoff 6 gave 0 exact Nightmare;
cutoff 4 gave 2, not 6: four of the six floor-defeating boards became shallow Hell 1.

## Decisions

Recorded answers, including the owner's two choices, are in [`clarifications.md`, part E](clarifications.md#part-e-decisions-in-one-place).

| Topic | Decision | Decided by |
|---|---|---|
| Scope and gate permission | Full plan and all six S3 groups; named heavy gates pre-approved for their owning tasks | Owner |
| Target scope | One target through dig, refinement and local search; report raw and attainable-range positions | Owner |
| Chain cutoff | Compare 4 and 6 on 36 fresh requests each; more exact hits wins, 6 on a tie; recheck after S3 | Owner |
| Requiredness | Derive from canonical ratings after monotone orders; reference floor solve uses the inherited budget | Plan author |
| Shallow-search budget | Measure 64/128/256/no extra cap on six cells; existing caps until the result is known | Plan author |
| Nishio depth | Deep default maximum 2; 3 only on request, never outside the ID's window | Plan author |
| New costs and bounds | R10 cost table B, ALS group chain; approved bounded-search starting values, one evidenced own-limit adjustment, freeze at MS17 | Plan author |
| Reference labels | Preserve v2 history and new-weight priors; add v3 expectations and explain reclassifications | Plan author |
| Warnings, examples and history | Both warnings, curated real help examples, truthful version note; no new exported certificate | Plan author |
| Offered levels and record | Accept final qualification; archive v2, update the live table in place; no intermediate pruning or weight tuning | Plan author |
| Order of work | Baseline/tooling, S2.1, S1, S2.2, S3, S2.3; task-owned hashes/goldens/examples | Plan author |

## Timeline

Intermediate phase boundaries were not all timestamped; the ranges below do not claim minute-level timings.

| Time (+07:00) | What was done / decided |
|---|---|
| 06:47 | Independent analysis started for both projects; this report covers Sudoku only. |
| During 06:47–08:52, phase 1 | Code/anchor checks, small probes and quick baselines; independent reports from both analysts. |
| Same interval, phases 2–3 | Cross-reviews and responses; reconciled Nightmare counts, certificate proof and task order. |
| Same interval, phase 4 | Joint drafts prepared, with unanswered choices made explicit rather than assumed. |
| 08:52 | Owner paused task-pack work until the joint reports and answers were reviewed. |
| By 09:50 | SA1's Sudoku check C1–C11 applied; preceding joint draft co-signed. |
| 10:00 | Plan-author answers committed as `1398dde`, including the two owner decisions. |
| From 10:02, phase 6 | Answers checked against code and incorporated; this brief prepared. No tests rerun. |
| 10:29 | Answers and document checks complete; reports ready for SA1's verification and owner/author acceptance. |
| 10:42–10:50 | SA1 verified the final report and brief: signed, two editorial corrections (V1-V2); AC01 agreed. |
| 11:10 | V1-V2 and the timing/credit notes applied; both analysts signed, awaiting owner/author acceptance. |

## Planned implementation and verification

This is the existing outline, **not an execution-ready task pack**. One developer works in this repository
at a time; the independent Pentomino work may proceed separately, but heavy timing runs are serialized.

| Order / ID | Work | Size | Planned gates, as affected |
|---|---|---|---|
| MS01 | Tier and reference APIs | M | Quick |
| MS02 | Baseline and both position metrics | M | GS |
| MS04 | Bounded golden/example/hash tooling | M–L | Recorder checks, quick |
| MS03 | Monotone orders and deterministic counters | M | GG, GR, GH, GD |
| MS05 | Required exactness, keeper, warnings and measured shallow cap | L | GG, GR, GS, GD |
| MS06 | One target through all three stages | L | GG, GR, GS |
| MS07 | Chain/depth IDs, measured cutoff and first qualification | L | GG, GR, GH, GS, GQ, GD |
| MS08 | Skyscraper, kite and empty rectangle | L | GG, GR, GH |
| MS09 | Finned fish and sashimi | L | GG, GR, GH |
| MS10 | Remote pairs and WXYZ-Wing | L | GG, GR, GH |
| MS11 | Unique Rectangle extensions and BUG+1 | L | GG, GR, GH |
| MS12 | XY-chain | M–L | GG, GR, GH |
| MS13 | Grouped chains and proof display | L | GG, GR, GH, GP |
| MS14 | Jigsaw leftovers and Killer regressions | L | GG, GR, GH, GD |
| MS15 | ALS enumerator and ALS-XZ | L | GG, GR, GH, GP |
| MS16 | Sue de Coq | L | GG, GR, GH |
| MS17 | Version/cache/history integration and frozen limits | M–L | GG, GR, GH, GD |
| MS18 | Final evidence, v2 archive and offered levels | M + runs | GS, GQ, GP, GD, GG check, quick |

Sizes estimate changed code/tests: M about 300–800 lines, L about 800–1,600; generated evidence is additional.
Output-changing tasks own regression hashes (GG), replay goldens (GR) and help examples (GH). Soak (GS),
qualification (GQ), performance (GP) and the manual difficulty suite (GD) supply the other evidence.
Introducing tasks also measure bounded finder work and latency. Each completed task must pass its quick checks.

Both qualification checkpoints cover all **135 variant/level cells with four workers**; only the final one
changes offers. GS repeats a fixed 17-cell, twelve-request manifest, plus the cap/window comparisons.
The earlier quick baseline passed: Generator **2,818 tests / 43 suites**, Player **1,609 / 29**.
No heavy gate ran during analysis, and no new suite or generation probe ran while applying the answers.

## Effort, risks and acceptance

- Planned implementation: **59–92 agent-hours**, excluding long gate wall time, not a delivery promise.
  The [v2 record](../difficulty-rating/qualification.md) reports 1,531 s "in total" for first-round requests;
  that is not a v3 qualification wall-time estimate.
- Combined analysis AI credits for **Pentomino and Sudoku**, at 10:52 (orchestrator's approximate snapshot):
  **23,500 total** — SA1 about 8,200; SA2 about 12,500; orchestrator about 2,800.
  This is shared analysis usage, not Sudoku-only usage or implementation cost.
- Some levels, especially Nightmare/Hell 1 and variant-specific Hard/Expert, may stop being offered.
  Full targeting or bounded searches may reduce hits; report losses and timings rather than weakening exactness.
- Rare real help examples, grouped-proof correctness, deterministic caps and repeated evidence runs are the
  main implementation/time risks. A changed final cap/cutoff selection goes back to the owner before qualification.
- **AC01 for acceptance:** the “attainable range” is an analytic lower bound, not a guarantee of every reachable
  score or a global minimum. R23 specifies rounding, vacuous-tier and undefined-position handling explicitly.
  Both analysts agree; the author's confirmation remains open in [`clarifications.md`, Part F](clarifications.md#part-f-remaining-concerns-after-the-answers-were-applied-for-acceptance).
- Acceptance covers the answered specification, these consequences, the evidence obligations, effort and AC01.
  It is not approval of unperformed tests. Then, and only then, may task-pack work resume.

## Documents

| File | Content |
|---|---|
| [`report-detailed.md`](report-detailed.md) | R1–R24, code evidence, ownership, gates, traceability and acceptance/signatures |
| [`clarifications.md`](clarifications.md) | Answers at `1398dde`; part E is the decision summary; part F contains open AC01 |
| [`plan.md`](plan.md) | Original plan; corrections and chosen answers are applied in the detailed report |
| [`claude-opus-5.5/`](claude-opus-5.5/) | SA1's independent report, cross-review, response, joint-draft check and final-report check |
| [`claude-opus-5.5/5-check-of-final-report.md`](claude-opus-5.5/5-check-of-final-report.md) | SA1's final verification; V1-V2 applied, no further check needed |
| [`gpt-6-astra/`](gpt-6-astra/) | SA2's independent report, cross-review and response |

**Analysis done, awaiting acceptance; no code changed. No task-pack or implementation work has resumed.**
