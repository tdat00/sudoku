# Plan version 3: cross-review of Opus's analysis (Sudoku)

Astra (SA2), 2026-11-15, phase 2.

Reviewed `claude-opus-5.5\5-plan-v3-analysis.md` (221 lines) against my phase-1 analysis, the plan and
clarifications at `2278b61`, and the committed evidence. Production source was read only with
`git show 75b99e6:<path>`, never from the mutable rating-v3 working files.
No engine, test, generation, benchmark or timing run was made. Only this cross-review is written.

In this file, **O-Snn** means Opus's `JV3-Snn`; **A-Snn** means mine. Those namespaces must not be merged
by their existing numbers. The joint report can assign the final finding IDs.

**Disposition of Opus's eight findings: 3 agree, 5 agree with a change, 0 disagree.**
The principal addition I accept is the butterfly correction, which also corrects the v2 joint report I wrote.
The confirmation manifest needs more specification. Neither point authorises a run before the narrowed
post-MS18e repair.

## 1. Finding-by-finding settlement

| Opus finding and analysis line | Verdict | Evidence and proposed joint position |
|---|---|---|
| O-S01, 112: butterfly's pool factor | **Agree** | At `75b99e6`, `core\js\engine\classic-model.js:101-102` gives butterfly 144 cells; `generator\js\engine\digger.js:620-634` gives it four default attempts. `docs\difficulty-v3\evidence\MS07e\plan.md:14,29,202` and its `projections\gq-projections.md:118` also identify the four-attempt population and the unqualified pilot. Transfer the four-attempt sensitivity, not the two-attempt one: **11.2-19.1 s**, still only a Projection. This is not a measured pooled result or a p95 |
| O-S02, 113: confirmation cohorts and arms | **Agree with a change** | `plan.md:347,374-382` names the widths and the confirmation cells separately, without assigning the confirmations to a stage or enumerating their arms. Specify those before pricing. Opus's 0.7/1.4 h cases use assumed typical times and pool factors; call them **Projections**, not costs derived solely from measured means. Also distinguish S5a confirmation from any later F6 kernel confirmation; a width-4/width-1 comparison cannot establish the kernel-only gate |
| O-S03, 114: the checkpoint predates Skyscraper | **Agree** | `75b99e6:tasks\difficulty-v3\MS08a-skyscraper.md:156` records the landed technique, 66/520 changed hashes and four changed reference ratings, with no level change. Its registered order is 112, weight 330 and base cost 33. Q is not a measurement of this later runtime. Name the source gap explicitly; keep the planned F1 reconciliation. This is a Low provenance correction, not a reason to run another checkpoint now |
| O-S04, 115: omitted 375-point statement | **Agree with a change** | `clarifications.md:728-736` does promise that sentence. The arithmetic is `1.25*(1700-1400)=375`, for a one-step lower-bound illustration, not a measured improvement or a wider band. The omission is a literal fidelity issue, not an implementation blocker. Do not add a new historical derivation during pruning: retain the unchanged-band fact and its pinned answer; Fable can decide whether the active plan needs the illustration |
| O-S05, 116: F0 transforms and F2 operating policy | **Agree with a change** | Make the adapter-transform audit and the chosen warm/cold and early-hit operating policy explicit in the manifest. The underlying obligations are not wholly missing: `plan.md:337-347` already requires the narrowed repair and actual parity, and `229-242,357-372` already requires an early-hit path, cold/ready measurements and fixed outer concurrency. The gap is a checkable receipt and a policy frozen before confirmation, not permission to redesign the approved protocol |
| O-S06, 117: workers versus file mode | **Agree** | `75b99e6:generator\js\worker\worker-client.js:127` selects the main-thread lane for `file:`. Qualify `plan.md:76-77`: message-passing workers are usable where workers are available; the default file-mode path stays serial. This agrees with Q02 and the later pool sections |
| O-S07, 118: K2 admission arithmetic | **Agree with a change** | At zero overhead, `f >= (1-1/1.15)/(1-1/s)`: 0.130435 for unbounded `s`, 0.723320 for `s=1.22`, and 0.260870 for `s=2`. With overhead `u`, add `u` to the numerator. The v2 value 1.22 is an assumed favourable example, **not an established upper bound**. Therefore do not impose an unconditional 70% profile-share rejection rule; admission must use the justified attainable gain and upkeep for the actual proposal |
| O-S08, 119: shared propagation can change Nishio | **Agree with a change** | The source supports the warning: `core\js\engine\tech-chain.js:654,673` uses shared constraints inside `refutes`. Stronger propagation can change canonical findings. However, `plan.md:165-176` already forbids changes to findings/order/caps and covers inherited propagation checks. Carry the specific warning in the joint correction or cross-reference that contract; do not describe the intrinsic boundary as absent or require duplicated prose in every parked-item row |

Opus's summary at line 27 understates its own table: there are **eight** rows, one Medium and **seven**
Low, not one Medium and six Low. This is bookkeeping, not another plan finding.

## 2. What changes in my analysis

### 2.1 Speed correction

I withdraw my phase-1 section C's blanket assertion that every section-4 scenario needs no substantive
number correction. The butterfly error was inherited from our v2 joint table, not introduced by Fable.

| Quantity | Before | Corrected | Kind and basis |
|---|---|---|---|
| Butterfly Hell 1, selective-pool scenario | 19.5-23.8 s, using the two-attempt factors | **11.2-19.1 s** | Projection: `38.3/3.43` to `39.5/2.07`, using the plan's cited pilot range and the old four-attempt transfer |
| Butterfly measured baseline | Pilot 38.3-39.5 s; no exact hit; not qualified | Unchanged | Measured record as cited by the plan; no new run |
| Availability | No demonstrated offer | Unchanged | Same-result pooling cannot turn a completed shallow miss into an exact hit |
| Other section-4 figures | Old-pool transfers or unpriced cases | No additional numerical correction accepted here | Still conditional on independent consumed work, source, startup and device; not guaranteed ranges |

For the confirmation-cost illustration, `20*1.5*81/3600` is about 0.675 h and `20*3*81/3600` is 1.35 h.
Those are arithmetic on an **assumed** six-cell typical-time sum and an **assumed** arm-cost multiplier.
They exclude the full manifest's validation, startup, grace, cleanup and other diagnostics. Neither the
old request distribution nor a sum of cell p95s is a ceiling for the final catalogue.

### 2.2 My findings that remain

| My finding | Joint treatment recommended |
|---|---|
| A-S01: the broad passing-controls sentence | Keep. `plan.md:103` needs the real-tier qualifier or an enumeration: Q has classic4 Nightmare 0/14 and classic6 Nightmare 4/18. These diagnostic cells are not passing controls |
| A-S02: reuse of outcomes under different concurrency | Keep. Reuse intrinsic puzzle/exactness facts only for completed, uncensored requests with the required full identity. Do not reuse timeout-as-miss, on-time rates or qualification verdicts under another guard/concurrency protocol. The qualifier counts timeout/error outcomes as misses |
| A-S03: kernel-control tolerance and CPU statistic | Keep as proposed Q27 below. Separate the kernel comparison from S5a's width-one non-regression check; the current text does not finish that scoping or the CPU statistic |
| A-S04: branch-local evidence links | Keep. Q and the chain-window record are in the pinned rating-v3 history, not in this improve-generating snapshot. Replace their live relative-path assumptions with commit-pinned references |

The Skyscraper note, confirmation placement, explicit adapter receipts and file-mode wording are useful
additions from Opus. The K2 arithmetic is useful only with its assumptions retained.

## 3. Unified questions for Fable

These are proposed final numbers, not additions to `clarifications.md` in this task.

| Original question | Genuinely open after v3? | Disposition |
|---|---|---|
| Opus IG-S-Q26: confirmation stages and arms | **Yes** | Keep as **IG-S-Q26**; include operating-policy freezing and the distinction from F6 kernel confirmation |
| Astra IG-S-Q26: kernel regression and CPU rules | **Yes** | Keep as **IG-S-Q27**; it is not a duplicate of the cohort question |

### IG-S-Q26: Where and against which arms do the confirmation cohorts run?

**Context:** `plan.md:343-382`; O-S02 and O-S05. The selected cells are named after F1, but the
20-or-more-request confirmation is not assigned to a stage or a complete arm matrix.

**Question:** Is it F2's population, a later S5a confirmation, or confirmation of admitted F6 work?
Which arms run on which seeds, and when are the per-cell early-hit policy and warm/cold protocol frozen?

**Options:** (a) All four F2 arms on every confirmation seed. (b) A small width-selection/policy pilot,
then separate held-out width-one/width-four confirmation with the selected policy fixed. (c) Confirm only
later admitted prototypes, with explicit separate evidence required before S5a enablement.

**Recommendation:** (b) for S5a, with native/no-op and width-invariance canaries retained; declare the pilot
and confirmation seeds and controls before running. Any F6 kernel confirmation gets its own costed,
same-pool comparator, not credit from the S5a comparison. This chooses a manifest, not an early SM5 run.

### IG-S-Q27: Which regression tolerance and CPU statistic bind the kernel controls?

**Context:** `plan.md:239-240,347,357-364,384-397`; A-S03.
A reference/new ratio of 0.95 permits up to `1/0.95-1`, about **5.26% more wall time**.

**Question:** Is that tolerance explicitly scoped to the named kernel controls, apart from the strict
serial non-regression rule, and which per-cell CPU statistic must not rise?

**Options:** (a) The stated ready-wall geometric-mean ratio >=0.95 for kernel controls, with a named CPU
statistic and threshold, and an explicit distinction from the pool's serial check. (b) Strict >=1 on both.
(c) A fully specified confidence/tolerance rule, declared before evaluation.

**Recommendation:** fix the scope, comparator, CPU aggregation and threshold in advance. A ratio of CPU
totals, a median paired ratio and a geometric mean are different tests. Do not choose the most favourable
one after seeing the cohort. No change to a binding owner condition is implicit in this clarification.

**New owner decisions: none.** The already-listed repair price, manifest approval, enablement and later Hell
route remain outstanding at their specified stages.

## 4. Final pruning position

I change my phase-1 position on the v2 joint report and the v2 analyst files. A usable current joint report
plus verified archive references is enough; keeping every intermediate explanation live is unnecessary.
I also withdraw my proposal to trim the dated clarification sections: they are the decision log.

### 4.1 Companion files

| Item | Final position | Reason / condition |
|---|---|---|
| `report.md` | **Keep; fix historical/current references in existing metadata** | R3's errata and its reader use it. Prefer a same-line metadata edit over inserting a banner that shifts cited lines. Do not change any recorded R3 artifact |
| `plan-v2-joint-report.md` | **Delete after the v3 joint report exists and link fixes are made** | The operative positions are in v3, the decision log and the new review; the new joint report must retain the outstanding contract/manifest corrections. The exact old document is at `21da9c2` |
| Both analysts' `3-plan-v2-analysis.md` and `4-cross-review-of-plan-v2-analysis.md` | **Delete in the same archival change** | Superseded intermediate analyses. Detailed historical reasoning stays at `21da9c2`; no unique binding decision is lost once the active conditions and current corrections are carried into the v3 joint report |
| Both `1-speed-summary.md` files | **Delete after reference fixes** | I retain this recommendation. They duplicate tables in the kept full analyses and report. Historical firewall filename inventories are not live document dependencies. Opus's contrary keep recommendation remains a pruning disagreement unless its cross-review changes it |
| Both `1-analysis.md` and `2-cross-review.md` files | **Keep** | Substantive estimate derivations still support the retained report and evidence readers |
| `clarifications.md` | **Keep every section; commit-pin links only** | Its dates distinguish old status from current decisions. My proposed trims at 528-547 and 597-615 are withdrawn |
| `evidence\` | **Keep all recorded packages and inventories** | No disposable working draft identified; superseded receipts remain evidence |
| `tasks\improve-generating\*` | **Keep** | Executed/deferred population, approval and stop contracts are provenance, not the new manifest |

**Archive verification:** Git blob IDs for the v2 joint report and all four 3/4 files are identical at
`21da9c2` and `2278b61`. No reconstruction of their contents is needed.

### 4.2 Link fixes before deletion

| Referrer | Replacement |
|---|---|
| `plan.md:5` | `docs\improve-generating\plan-v2-joint-report.md` at `21da9c2`, retained in the shortened authority note |
| `clarifications.md:621-622,887` | Pin the joint report and the referenced local v2 analyst question lists to `21da9c2`; leave the answer/decision text intact |
| The new v3 joint report's basis | Name all deleted v2 documents at `21da9c2`, not as live relative links |
| This round's analyses/reviews | Their snapshot-qualified references remain historical; the joint report should state that convention explicitly |
| `report.md:8`, both analysts' `2-cross-review.md:3-5`, if the speed summaries are deleted | Replace each live summary link/reference by its full path at `2278b61` |
| `report.md:5` | Its original Plan link means `plan.md` at `1437774`; identify the current plan separately without implying the old forecasts describe v3 |
| `plan.md:31-32,97`, and current source lists | Q/chain-window evidence at `75b99e6`, not nonexistent files on this branch |

The committed Markdown/script reference scan found no other live callers of the disputed v2 documents.
Do not rewrite historical source inventories or hash manifests when a companion is archived.

### 4.3 Pure-history cuts in the active plan

| Exact v3 lines | Final cleanup position |
|---|---|
| 3-9 | **Trim** to the v3 identifier, the old plan commits and the current authority links; commit-pin the old joint report |
| 35-55, section 0 | **Remove the duplicated changelog**, retaining the existing unchanged-band fact by moving it verbatim to the baseline or referring to the preserved Q21 answer. Do not introduce the missing 375-point derivation as our cleanup edit |
| 158, standing column only | **Trim** the retirement slogan; retain the measured 74-331 range and its old-source/sample-cost status |
| 471-472, final widened-window sentence only | **Delete that historical withdrawal sentence**; retain the preceding list of still-binding and superseded answers |
| 11-17, 147-159 measurements, 178-291 dispositions, 439-470 decisions, 474-494 risks | **Keep**, apart from the small overlapping cuts above. I withdraw the broader phase-1 cuts; substantive wording corrections go to Fable |

These cuts are history/link work only. The butterfly number, source wording, gate definitions and operating
policy are **corrections for Fable**, not changes for the cleanup operator to make. If any proposed deletion
lacks both analysts' agreement, retain it without blocking the agreed archival changes.
