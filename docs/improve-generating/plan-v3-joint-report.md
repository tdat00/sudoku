# Improve generating (Sudoku): joint report on plan version 3

Analysts: Opus (claude-opus-5.5, SA1) and Astra (gpt-6-astra, SA2).
Report author: Astra. 2026-11-15.

**Status:** input for Fable's next revision, not an implementation approval, qualification result or run
authorisation. No engine, test, generation, benchmark or timing run was made. Only this report is written.

**Basis.** `plan.md` and `clarifications.md` at `2278b61`; both analysts' `5-plan-v3-analysis.md` and
`6-cross-review-of-plan-v3-analysis.md`; the retained v2 joint report at `21da9c2`; the provisional
`evidence\phase0\provisional-r1\report-r3.md` (R3) and
`evidence\phase0\smoke-rating-v3-8b70875\smoke-report-r2.md`; and the checkpoint and source at `75b99e6`.
The four new analyst files are inputs from this review round, not files claimed to exist at `2278b61`.
Production source was checked through Git objects, never the mutable rating-v3 working files.

All plan line numbers below mean **the unpruned plan at `2278b61`**. Source paths are repository-relative.
**Measured** means a recorded observation; **Derived** means arithmetic or a source-control-flow implication;
**Analysis** means a judgement. Speed scenarios are separately labelled **Projection**, not measurements or
confidence intervals.

## 1. Verdict and fidelity

**The direction of v3 is jointly supported. Keep its smaller scope and its owner decisions; correct the
remaining statements and finish the measurement protocol before it is used.**

There is no reason to reopen eager pooling, the mandatory passing-cell frontier screen, the attempt sweep,
an early SM5 run or K5 as a new mechanism. Selective S5a is a tail/failure-time item; S6 and S7 address failure
handling and robustness. K2 remains conditional on a profile and equivalence proof; K4 is a diagnostic.
No new kernel multiplier, exact yield or offer is established.

| Input to v3 | Joint fidelity assessment |
|---|---|
| JV2-S01-S16 and the v2 candidate/phase positions | The operative corrections are taken in: CPU is not bounded by 1.6x; partial S3 is not full S3; old solve-count premises are retired; pool capacity, checkpoints, missing cells, Killer distinctions and bank restrictions are retained. The inherited butterfly forecast still needs correction |
| IG-S-Q19 | Taken in: intrinsic findings/order/units/caps stay frozen; a generator version does not license a canonical-rating change; inseparable guard sites stay on the reference path |
| IG-S-Q20 | The intended comparator, thresholds and order are taken in. The control tolerance's scope and CPU statistic remain to be fixed, Q27 below |
| IG-S-Q21 | The substantive correction is taken in: the Nightmare band did not widen. The promised 375-point historical illustration is absent, but no current rule needs it; do not reintroduce it as a build requirement |
| IG-S-Q22 and Q25 | Taken in: inner width four at outer jobs one, serial controls at outer jobs one; throughput studies separate; no preliminary SM5 |
| IG-S-Q23 | Taken in: diagnose Hell 1 first, keep unqualified cells unoffered, and approve a live-search or bank programme only with its later evidence and price |
| IG-S-Q24 | Telemetry and the proposed confirmation cells are taken in. Outcome reuse needs the uncensored-request qualification, and the confirmation stage/arms need specification |
| IG-S-D1-D6 | All six owner choices are incorporated. The narrowed repair follows MS18e; its price precedes the round's separately approved price. No old time balance carries over |
| F0 transforms, F2 operating policy, stronger shared propagation | Covered by the repair, pool and intrinsic-contract sections. Earlier claims that these contracts were absent are withdrawn. The manifest still records the actual adapters, policies and receipt |

The current targets are based on **Q, the MS07e checkpoint on the MS07d runtime**, not a new measurement
at `75b99e6`. That later source already includes Skyscraper. F1 must reconcile again after the final
catalogue; nothing here changes active difficulty-v3 qualification or the routing of its six omitted cells.

## 2. Joint findings

These are new joint IDs, not either analyst's colliding phase-1 numbers.
**Counts: 0 High, 2 Medium, 7 Low.**

| ID | Severity | Kind | Plan lines | Finding and disposition |
|---|---|---|---|---|
| JV3-S01 | Low | Derived | 316 | Butterfly is a four-attempt board, but its Hell 1 scenario uses the two-attempt factors. Correct **19.5-23.8 s to 11.2-19.1 s**, as a Projection. This also corrects the v2 joint report's inherited estimate |
| JV3-S02 | Medium | Analysis | 343-351, 374-382 | The 20-or-more-request confirmation cohorts have no assigned F step or complete arm matrix. Resolve Q26 before pricing them; do not treat their presence in the plan as a run approval |
| JV3-S03 | Medium | Analysis | 362-363, 839-841 in clarifications | Concurrency-independent intrinsic puzzle/exactness facts do not make timeout or on-time outcomes reusable. Restrict reuse to completed, uncensored requests with the required identity; qualification/guard outcomes need their matching protocol |
| JV3-S04 | Low | Measured | 103 | “The other executed non-Killer cells pass” includes failed small-board diagnostic cells. Q records classic4 Nightmare 0/14 and classic6 Nightmare 4/18. Add “real-tier” or enumerate the passing controls |
| JV3-S05 | Low | Analysis | 239-240, 388-394 | A reference/new ratio of 0.95 permits about 5.26% more time, while the pool has a strict serial non-regression rule. State the distinct scopes and the per-cell CPU statistic before evaluation, Q27 |
| JV3-S06 | Low | Measured | 87-97, 476-477 | Q predates landed MS08a. The record reports 66/520 changed hashes and four changed reference ratings, with no level change. Name that source gap instead of presenting the checkpoint as the checked source's qualification |
| JV3-S07 | Low | Derived | 76-77 | “Workers with message passing are fine” needs the existing file-mode qualification. The default `file://` path is the serial main-thread lane |
| JV3-S08 | Low | Derived | 390-397 | The K2 admission example should use its 1.15 threshold and account for overhead. A 72% share requirement follows only from an assumed attainable kernel factor 1.22, not from a proved universal ceiling |
| JV3-S09 | Low | Analysis | 31-32, **96** | Q and the chain-window citation are absent from this branch snapshot. Pin them to the history at `75b99e6`. The earlier reviews' “line 97” for the chain-window link was one line high |

**Severity settlement.** Astra accepts Opus's Low classification for JV3-S05: section 5.4 already requires
the evaluation protocol to be fixed after F3 and before evaluation. The question remains mandatory at that
step, but does not block the earlier diagnostics. The other severities above are agreed.

**Remaining technical differences: none on Sudoku's direction or the corrections below.** The 375-point
sentence, the propagation example and the repeated F0/F2 clauses are not additional missing-contract findings.
The crossed pruning preferences are settled by the orchestrator's keep-unless-both-support-deletion rule,
section 7.

### Evidence anchors

- Butterfly: `core\js\engine\classic-model.js:101-102` and
  `generator\js\engine\digger.js:620-634`, at `75b99e6`; the pilot population is also identified in
  `docs\difficulty-v3\evidence\MS07e\plan.md:14,29,202` and its `projections\gq-projections.md:118`.
- Reuse and small controls: `generator\tests\qualify.js:19-23` and
  `docs\difficulty-v3\qualification-checkpoint-2026-11-15.md:32-33`, at `75b99e6`.
- Skyscraper: `tasks\difficulty-v3\MS08a-skyscraper.md:156`, at `75b99e6`.
- File mode: `generator\js\worker\worker-client.js:127`, at `75b99e6`.

## 3. Corrections for Fable, not cleanup edits

| ID / location | Exact replacement or addition recommended |
|---|---|
| JV3-S01, line 316, butterfly's final scenario only | Replace `19.5 to 23.8` with **`11.2 to 19.1`**. Keep the pilot, no-hit status and conditional “completed-request scenarios” label |
| JV3-S04, line 103 | Replace `and the other executed non-Killer cells pass` with **`and the other executed non-Killer real-tier cells pass`** |
| JV3-S06, section 2.1 | Add: **“Q predates MS08a (Skyscraper), already present at the checked source `75b99e6`. Its recorded E update changed 66 of 520 hashes and four reference ratings, with no level change. F1 re-derives the baseline on the final catalogue.”** |
| JV3-S07, line 77, final clause | Replace `workers with message passing are fine` with **`message-passing workers are usable where workers are available; the default file:// path remains the serial main-thread lane`** |
| JV3-S08, section 5.4 | Optional explanatory addition: **“For K2's factor 1.15, admission needs `f >= (1 - 1/1.15 + u)/(1 - 1/s)`. At zero overhead this is 13.04% in the unbounded-gain limit, 26.09% at `s=2`, and 72.33% at `s=1.22`. The last value assumes that kernel gain; it is not a hard share cutoff.”** |
| JV3-S02 and JV3-S05 | Apply the author answers to Q26 and Q27; do not silently select arms, tolerances or CPU aggregation in the implementation |
| JV3-S09 | Apply the source-reference pins listed in section 7.3 |

For **JV3-S03**, replace the outcome-reuse bullet at lines 362-363 by:

> Q's `--jobs=4` records are context, not matched timing controls. A completed, uncensored request with
> matching source, catalogue and full effective request identity may supply the stored puzzle's intrinsic
> validity and exactness facts. Do not reuse a timeout/error as a proved non-exact outcome, or carry hit,
> on-time or qualification rates across different guard/concurrency protocols. A needed completion or
> timing outcome without a matching protocol is measured again.

This keeps the distinction already made in section 4 between a completed same-result request and an
observed response under a wall guard. Missing attempt/stage fields remain missing.

## 4. Before/after speed: the row that changes

| Cell | Recorded baseline | V3's old phase-1 scenario | Corrected phase-1 scenario | After the recommended mix / basis |
|---|---|---|---|---|
| Butterfly Hell 1 | Quoted pilot 38.3-39.5 s, no exact hit; no qualification (**Measured record**) | 19.5-23.8 s (**Projection**, two-attempt transfer) | **11.2-19.1 s (Projection)** | No additional credited factor. Four-attempt sensitivity: `38.3/3.43=11.166` to `39.5/2.07=19.082`, assuming comparable distributed attempt work |

No measured value or availability verdict changes. This is not a pooled measurement or a p95, and the
range is not a bound: a dominant attempt, startup, contention or device limits may remove the gain.
Completed shallow misses remain misses. All other section-4 projections retain their existing caveats;
there is no new current-source kernel or browser factor to add.

## 5. Final questions for Fable

### IG-S-Q26: Where and against which arms do the confirmation cohorts run?

*Joint. Blocks: the frozen manifest's arm matrix, price and the evidence required before pool enablement.*

**Context.** F2 names native and widths 1, 2 and 4. Section 5.3 separately proposes 20 or more paired requests
on Greater-Than Master, Killer Master and Nightmare, diagonalX Hell 1, samurai Hell 1, and mega16 Nightmare
if still unqualified, plus classic9 and mega12 Nightmare controls. Cells are fixed after F1; the confirmation
has no assigned F step or arm matrix. F6's kernel-only gate has a different comparator.

**Question.** Where do these confirmations sit, which arms and control counts run, and when are the
per-cell early-hit policy and warm/cold operating protocol frozen?

**Options.** (a) All four F2 arms on every confirmation seed. (b) A small F2 width/policy pilot, then held-out
width-one/width-four confirmation after F5 and before F6. (c) Confirmation only of later admitted F6 work,
with separately specified evidence still required for S5a enablement.

**Joint recommendation.** (b): about five pilot seeds per cell as a costed proposal, then at least twenty
independent held-out pairs for the selected, admitted confirmation cells; keep native/no-op and width
invariance checks. Fix the chosen policy before confirmation. Retain the bounded diagnostic purpose for
unoffered Hell cells; their inclusion is not a wider live-search programme. A later kernel confirmation is
separately priced against the same post-phase-2 generator, quotas and pool, not against serial S5a.

**Price/gate effect.** Four full arms mean 80 executions per cell at twenty seeds; a two-arm confirmation
means 40 plus the pilot (Derived counts, not a wall-time saving). The manifest must price every command,
population, startup, validation, grace and cleanup. No preliminary SM5 is authorised and the official
40-request qualification population is unchanged.

Plan-author answer:

### IG-S-Q27: Which tolerance and CPU statistic bind the kernel controls?

*Joint. Blocks: fixing the kernel evaluation protocol after F3, before evaluating an optimisation.*

**Context.** Section 5.4 uses the per-cell geometric mean of paired ready-wall reference/new ratios,
thresholds 1.5 or 1.15 on targets, at least 0.95 on named controls, and “CPU may not rise”.
S5a separately retains strict serial non-regression. At 0.95, new wall time may be about 5.26% higher.

**Question.** Is the 0.95 tolerance expressly limited to the named kernel comparison, distinct from the
pool's width-one check? Which per-cell CPU aggregation and threshold bind: a paired geometric mean,
cohort totals or a specified bound?

**Options.** (a) Explicitly separate the kernel-control tolerance from S5a's serial check, and define the
CPU statistic and threshold. (b) Use strict >=1 wall/CPU ratios on both. (c) State another predeclared
confidence/tolerance rule and its scope.

**Joint recommendation.** State the scope now, and fix the exact CPU statistic with the targets/controls
after F3 and before evaluation, as section 5.4 already requires. Report CPU including speculation and cold
wall separately. Do not select the best-looking aggregation after seeing results or implicitly relax an
owner-bound serial condition.

**Price/gate effect.** This does not authorise another run; it prevents an ambiguous pass/fail verdict or
an avoidable repeat of a wrongly specified comparison.

Plan-author answer:

## 6. Owner decisions

**None new.** IG-S-D1-D6 remain in force. The repair's cost, the subsequent manifest's price, the version
and timed-result choices before phase 2, pool/mobile enablement, and any later Hell route still return to
the owner at the stages already listed in plan section 7.

## 7. Final pruning and link-fix manifest

This is the execution list agreed under the orchestrator's **only-common-deletions/cuts** rule.
No deletion or edit in this section has been performed by the analysts.

### 7.1 Files

| Files under `docs\improve-generating\`, unless stated otherwise | Action |
|---|---|
| `claude-opus-5.5\1-speed-summary.md`; `gpt-6-astra\1-speed-summary.md` | **Delete after the link pins below.** Both are superseded duplicate tables; both exact files exist at `2278b61` |
| `report.md`; both `1-analysis.md` and `2-cross-review.md` files | **Keep; links may be pinned only.** No banner or line insertion in `report.md`: the historical errata reader asserts its line references |
| `plan-v2-joint-report.md`; both analysts' 3-* and 4-* files | **Keep.** The analysts' final preferences crossed; there is no shared deletion approval |
| `clarifications.md` | **Keep every section.** No trimming, renaming or substantive rewriting as cleanup |
| `evidence\`; `tasks\improve-generating\*` | **Keep all recorded material.** Filename inventories and hash manifests describe the tree at the run and stay unchanged |

### 7.2 Exact plan cuts

Apply against `plan.md` at `2278b61`. In the table, `<br>` denotes a line break and an empty element denotes
a blank line. The code delimiters display literal Markdown. Apply the link pins first without adding
lines, then C2 and C1 in descending line order.

| Cut | Original lines | Old text | New text |
|---|---|---|---|
| C1 | 7-9 | ``> IG-S-Q25 and the owner decisions IG-S-D1 to IG-S-D6 ([clarifications.md](clarifications.md)). It is written``<br>``> as one current document: the layered "version 2" notes and the addendum are merged into the sections they``<br>``> belong to. The full mechanism text of the items that version 3 parks or drops stays in version 2.`` | ``> IG-S-Q25 and the owner decisions IG-S-D1 to IG-S-D6 ([clarifications.md](clarifications.md)).``<br>``> The full mechanism text of the items that version 3 parks or drops stays in version 2.`` |
| C2 | 35-55 | ``## 0. What version 3 changes``<br><br>``1. **The targets are re-derived** (section 2). Passing Nightmare cells become regression controls. The targets``<br>``   are the remaining time failures, Killer, the robustness tail and the diagnosis of Hell 1.``<br>``2. **S1, S2 and the Nightmare frontier screen leave the mandatory scope**, with the attempt sweep. They return``<br>``   only for a named cell that fails on the final catalogue. This is prioritisation, not a refutation.``<br>``3. **S5a is pursued selectively** (OD-S5, decided (B)): up to four workers, with an early-hit path and a serial``<br>``   fallback. It is a tail and failure-time item. "Up to 1.6 times the CPU" was not a bound and is withdrawn.``<br>``4. **No kernel factor is priced.** K2 is a conditional prototype after profiling, K4 a small diagnostic, K1 and``<br>``   the chain work parked, K3 dropped from this feature, K5 dropped as already present.``<br>``5. **A contract boundary** separates the rating's intrinsic finder semantics from generator-only quotas``<br>``   (section 3.1, IG-S-Q19). No generator version licenses a change of the canonical rating.``<br>``6. **The kernel gate is defined** (section 5.4, IG-S-Q20): a paired whole-request factor per named target.``<br>``7. **The frozen round is reduced and staged**, F0 to F6 (section 5), after a narrowed harness repair``<br>``   (IG-S-D2). Its protocol is inner width four at outer `--jobs=1` (IG-S-D4).``<br>``8. **Hell 1 stays unoffered and is diagnosed first** (IG-S-D3). No bank is designed before the final catalogue.``<br>``9. **Withdrawn statements.** The Nightmare band did not widen "from about 220 to about 590 points": it is``<br>``   `[1500, 2400)` before and after MS07 (JV2-S04). The "1,296 solves per sample" and "10 times fewer solves"``<br>``   costing is retired (JV2-S05). The other corrections of the joint report's section 6 are taken in where``<br>``   their subject appears.``<br> | **Delete**, including the final blank line 55 |

**Count:** two contiguous edits; C1 removes one line, C2 removes twenty-one: **22 plan lines removed**,
494 -> **472** before any later substantive revision. Existing references to the preserved Q21 answer retain
the unchanged-band fact; no 375-point historical addition is needed during cleanup.

**Not cut:** lines 11-13 (Astra's final cross-review keeps them), 158 and 471-472 (Opus withdraws those
cuts), or the current risks/operative dispositions. Earlier “about 30 lines” estimates are superseded by
this exact intersection. Substantive corrections in section 3 go to Fable, not the cleanup operator.

### 7.3 Every required link pin

Paths in the File column are relative to `docs\improve-generating\`. Preserve the existing physical line
breaks. These are **eight target replacements at six source locations**; L2-L6 resolve all five live
references to the two deleted summaries.

| Fix | File and original line | Old target/text | New commit-pinned text |
|---|---|---|---|
| L1 | `report.md:5` | `[plan.md](plan.md)` | `` `plan.md` at `8c5bc25` `` |
| L2 | `report.md:8`, Opus link | `[1-speed-summary](claude-opus-5.5/1-speed-summary.md)` | `` `docs/improve-generating/claude-opus-5.5/1-speed-summary.md` at `2278b61` `` |
| L3 | `report.md:8`, Astra link | `[1-speed-summary](gpt-6-astra/1-speed-summary.md)` | `` `docs/improve-generating/gpt-6-astra/1-speed-summary.md` at `2278b61` `` |
| L4 | `claude-opus-5.5\2-cross-review.md:4`, first mention | `` `1-speed-summary.md` (SA2) `` | `` `docs/improve-generating/gpt-6-astra/1-speed-summary.md` at `2278b61` (SA2) `` |
| L5 | `claude-opus-5.5\2-cross-review.md:4`, remaining mention | `` `1-speed-summary.md` `` | `` `docs/improve-generating/claude-opus-5.5/1-speed-summary.md` at `2278b61` `` |
| L6 | `gpt-6-astra\2-cross-review.md:5` | `` `1-speed-summary.md` `` | `` `docs/improve-generating/claude-opus-5.5/1-speed-summary.md` at `2278b61` `` |
| L7 | `plan.md:31`, within the two-line Q entry at 31-32 | `` `../difficulty-v3/qualification-checkpoint-2026-11-15.md` `` | `` `docs/difficulty-v3/qualification-checkpoint-2026-11-15.md` at `75b99e6` `` |
| L8 | `plan.md:96`, not 97 | `` `../difficulty-v3/chain-window-2026-11-15.md` `` | `` `docs/difficulty-v3/chain-window-2026-11-15.md` at `75b99e6` `` |

The archive targets were checked. The committed Markdown/script scan and the current review-document
scan found no further live summary links. Other mentions in these reviews are pruning inventories;
evidence inventories are historical records, not live link failures. The kept v2 joint report and 3/4 files
need no deletion-related link change. Do not modify a measured record to conceal an archived filename.
