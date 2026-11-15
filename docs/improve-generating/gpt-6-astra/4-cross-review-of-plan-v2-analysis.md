# Plan v2 analysis: Astra's cross-review of Opus

2026-11-15. Phase 2, not the joint report.

Reviewed: `docs\improve-generating\claude-opus-5.5\3-plan-v2-analysis.md`, referred to below as Opus's analysis.
Compared with my `3-plan-v2-analysis.md`, the cited MS07e/R3/smoke records, the source and the resolved owner
decisions. No generation, tests, profiling, benchmarks or git commands were run.

References beginning `claude-opus-5.5\` below are relative to `docs\improve-generating\`.

## 1. Overall position

We agree on the main change of direction: retire the old mandatory Nightmare frontier screen, preserve the
successful native path, target the remaining latency/robustness problems, make eager speculation conditional,
and price a smaller frozen-source package.

The material differences are:

1. **K5 is already implemented, not an unbuilt optimisation waiting for calibration.**
2. K1's depth-1 check proof is incomplete; K2's x1.2-2 is an unverified kernel assumption, not a current-source
   estimate established by O(n) copying.
3. Zero exact final Hell 1 results do not measure K4's candidate-level pass rate or prove a cheap screening
   benefit.
4. Slow exact hits and a censored mega16 request cannot be assigned completed-request speed-ups or unchanged
   eventual outcomes without their missing work records.
5. IG-S-Q02 already establishes pooled qualification, serial reporting and a non-oversubscription rule.
   The remaining task is to pin the actual invocation, not reopen an unanswered policy question.

**Correction to my own phase 1:** Opus correctly brings in **S-OD7**. My discussion of Q-MS07e-1 did not carry
its final disposition. `docs\difficulty-v3\clarifications-resolved.md:1972-1985` says Killer **Hard and Expert**
remain withheld until a later calibration, with no weight recalibration inside v3. They still participate in
the final 135-cell qualification; withholding is reported separately from the raw verdict. S-OD7 does not
decide Killer Master/Nightmare, and S-OD8 does not change qualification or authorise extra runs.

## 2. Answers to Fable: agreements and differences

| Topic | Assessment of Opus | Proposed joint position |
|---|---|---|
| Current targets, Q1 | **Agree**, including mega16 Expert's 30 s budget and the six unlaunched cells. Adopt the S-OD7 correction | GT Master is a demonstrated time target; GT Normal is a margin/CV6 target; keep the six missing cells and S7 explicit. No claim that every shallow miss is necessarily a weight problem |
| Slow requests, Q2 | **Agree** on the control-flow inference for completed misses and the inability to identify slow hits' attempt counts | Use the per-request split, not configured attempts as observed attempts. Include Hyper/Jigsaw/Sohei Hell 1 from my table where useful; their omission from Opus's shorter table is not an error |
| Required telemetry | **Agree**, with additions | Retain actual attempts, returned origin, per-attempt/sample stages, quota/stop reasons, cold/ready wall, CPU including discarded work, and both concurrency dimensions |
| Profiles, Q3 | **Partially agree**: native V8 profiling is a good first step and can reduce adapter repair | A sampling profile locates hot code. It does not replace per-family call/cap counts, read dependencies, check-site tracing or the stage/consumed-prefix record needed for the optimisation proof |
| K1 footprint | **Agree** for completed negative depth-2 root trials; **partially** for depth 1 | Whole-open-grid reads invalidate the conservative cross-step root cache. Depth-1 dependencies may be local, but must include all propagation reads and inherited checks; do not promise one-check replay |
| K2 | **Agree** to profile before a prototype; **disagree** with a present x1.2-2 expectation | The pooled copies are already allocation-free after each depth's first use. Measure their fraction and trail upkeep, then use Amdahl's law. No production insertion into difficulty-v3 without an explicit scope amendment |
| K4, Q4 | **Agree** that no true floor screen runs today; **disagree** with the pass-rate and saving inferences | Park a default filter. A small frozen diagnostic can compare the actual floor against the all-chain proposal oracle if a residual target justifies it. Preserve the keeper and charge all work |
| Retiring SM2, Q5 | **Agree** as a priority decision, not a statistical refutation | No mandatory 40-grid screen or attempt sweep on currently passing Nightmare cells. mega16's pilot is not qualification; reopen an experiment only if the final baseline creates a target |
| Replacement work | **Partially agree** | Narrow the repair and record the missing work data. Prefer compatible MS18 baseline reuse. Profiles of failures are useful diagnostics, but a large zero-hit Hell 1 optimisation programme needs a scope decision |
| Time versus hits, Q6 | **Agree** for completed requests under a proved same-result optimisation | Do not carry those hit rates or time envelopes across the new finder groups. A previously censored request has an unknown eventual result |

### Candidate dispositions to carry forward

| Candidate | Opus | Astra / proposed joint disposition |
|---|---|---|
| K1 | Park until depth-1 share is worth caching | **Agree to park the proposed cross-step cache.** A completed negative depth-2 root reads every open cell. Any depth-1 or identical-state reuse experiment needs its own dependencies and check transcript |
| K2 | Prototype after profile; x1.2-2 kernel | **Profile, then prototype only if the measured copy share warrants it.** Retain both gain models as sensitivities, not average them into a forecast |
| K3 | Drop from this feature | **Agree in practical scope.** Drop the non-equivalent proposal. A future proved-identical bit-parallel implementation would be a different proposal, not permission to change intrinsic units here |
| K4 | Park until finders change the floor | **Park production adoption; conditional diagnostic only after the final floor/tier is known.** This reconciles my "prototype the diagnostic" with Opus's "park" |
| K5 | Park until Killer calibration; masks may enter phase 1 | **Disagree: drop as stated.** `combo-table.js` already precomputes sum masks and propagates changed cages; `dfs-solver.js:125-164` already uses MRV. A genuinely different optimisation must first be named and profiled |

The K5 source settlement is direct. `core\js\engine\combo-table.js:1-19,36-75,151-282` describes and implements
the combination table, filtering and changed-cage queue. `core\js\engine\dfs-solver.js:125-164` chooses the
lowest-index minimum-candidate cell and then the candidate digits. No new factor can be credited for adding
these existing mechanisms.

Stronger shared cage propagation is not necessarily a generator-only change: Nishio calls
`SG.constraints.place` too. A changed canonical finding or intrinsic cap cannot be authorised merely by a
new generator version.

## 3. Errors and over-claims in Opus's analysis

These are corrections to carry into the joint report, not requests to edit the phase-1 record.

| ID | Citation | Finding and proposed correction |
|---|---|---|
| S-CR1 | `claude-opus-5.5\3-plan-v2-analysis.md:90-107,190` | `refutes` calls `ctx.check()` **before** testing the work cap, then increments work. Depth-1 propagation can also call the inherited budget through `constraints.runExtensions:176-190`. Replace the "exactly one check" proof with preservation of the complete applicable check sequence; never cache a budget/cap exit as a completed negative |
| S-CR2 | `claude-opus-5.5\3-plan-v2-analysis.md:131-139,193` | The 112 final shallow results do not tell how many intermediate candidates get stuck without the Hell tier. Such candidates may be above band, unsolved or capped. State the candidate pass rate as unmeasured |
| S-CR3 | `claude-opus-5.5\3-plan-v2-analysis.md:137-138,193` | A floor-only solve is not an established cheaper replacement for rating a shallow candidate: the canonical proof already finishes within that floor. Restarting a full solve on a floor-stuck candidate adds work. Credit no fixed-candidate speed-up; measure steering/yield and prefix reuse separately |
| S-CR4 | `claude-opus-5.5\3-plan-v2-analysis.md:191` | A request factor is not the kernel multiplier times its share. Use `1/(1-f+f/s+u)`. O(n) copying alone does not establish a kernel x1.2-2, especially with existing pooled typed-array buffers |
| S-CR5 | `claude-opus-5.5\3-plan-v2-analysis.md:194,252,265` | K5's sum masks and MRV already exist. Remove its incremental x1.1-1.3 credit. S-OD7 is not a prerequisite for every same-result Killer speed optimisation and covers only Hard/Expert |
| S-CR6 | `claude-opus-5.5\3-plan-v2-analysis.md:174,252` | The slow exact Killer Nightmare requests have unknown attempt counts. The displayed 5-16 s values require a later-attempt assumption and are not an unconditional projection. Its measured p95 is one of those exact requests |
| S-CR7 | `claude-opus-5.5\3-plan-v2-analysis.md:172,183-184,254` | `>120 s` is censored, not a completed time. A conditional `>60 s` lower bound under a two-way capacity assumption is not proof of completion or an unchanged eventual hit. New finders may increase per-attempt cost, so old failure times are not upper envelopes for future exact requests |
| S-CR8 | `claude-opus-5.5\3-plan-v2-analysis.md:174,181-184` | S-OD7 does not settle Killer Nightmare's cause or availability. Say its current 19/24 is unchanged by a same-result optimisation, not that its remaining misses are decided to be a weight question |
| S-CR9 | `claude-opus-5.5\3-plan-v2-analysis.md:242` | The checkpoint did not run 40 requests in every cell: 129 cells, 4,311 requests, early stops, one expansion and six omissions. Forty was the first-round target. It published no live offers |
| S-CR10 | `claude-opus-5.5\3-plan-v2-analysis.md:264,271-273` | IG-S-Q02 does give the governing protocol: fixed inner width 4, reduce outer jobs to avoid exceeding physical cores, report serial beside pooled, with the file-mode caveat. The exact invocation still needs a receipt; it is not an unanswered serial-versus-pool decision |
| S-CR11 | `claude-opus-5.5\3-plan-v2-analysis.md:149-159,280-281` | Retiring tasks avoids proposed work; the old planning scenarios are not allocated or saved machine hours. SM5's measured benefit/CPU cost depends on the new workload and is not rating-independent. No pre-freeze run is authorised merely because architecture can be designed now |
| S-CR12 | `claude-opus-5.5\3-plan-v2-analysis.md:118-123` | `boundedObjective` does not make the proposal branch's separate DFS ambiguity check. It returns `techniques` or `tooHard` refusals from its restricted solve; `ambiguous` belongs to the guarded-uniqueness proposal path. Keep those oracle costs and refusal mechanisms separate |

The check-order correction in S-CR1 matters at an already-spent work limit: the reference still makes the
parent check before throwing `WORK_CAP`. A cached shortcut must not silently reverse that ordering.

## 4. Opus's version-2 findings

| Opus finding | Position | Joint correction |
|---|---|---|
| F1: CPU median presented as maximum | **Agree** | Keep the cell medians and the 4.39/4.13 observed pair maxima. Mandatory head-start/lazy speculation is a design condition, not proof that CPU stays below 1.6 |
| F2: 220 to 590 points | **Partially agree** | The fixed Nightmare band remains `[1500,2400)`. The figures can only be an effective headroom illustration, not a measured widening of that band; use the explicit derivation below or remove them |
| F3: smoke understates repair | **Agree** | Three textual failures, one stale exposure, two incomplete pure suites, no native/no-op puzzle parity. Repair only the adapters retained by the new package, but V8 alone does not certify their semantics |
| F4: early design versus SM5 | **Partially agree** | Architecture may be designed now; measured scheduling parameters and enablement require SM5. This is not a reason to run a new pre-freeze experiment |
| F5: full S3 and S4 unbuilt | **Agree** | The old first-phases gap cannot be attributed only to S3. Keep the scope distinction and the partial-S3 paired range 0.89-1.04 |
| F6: S5b ideal scaling | **Partially agree** | The plan already labels 29 s ideal. About 36 s using transferred efficiencies is a useful additional **Projection**, not a correction of the ideal arithmetic. Neither prices the new source |

The window issue can be resolved without inventing evidence. `difficulty.js` gives the technique-part
lower bound `1.25*w`, plus the empty-cell term and any extra work term. With old tier weight 1700,
the ideal headroom to 2400 is `275 - V - extra`; with weight 1400 it is `650 - V - extra`.
The difference in the one-step lower bound is 375 points. Approximate 220/590 figures need particular
assumptions about `V` and extra deductions. The joint report should state the formula and unchanged band,
not present those two numbers as a measured, board-independent window.

Additional findings from my phase 1 still stand:

- The specified width-4 pool has a general capacity ceiling `min(4,A)`, not eight on 81-cell boards.
- S6 can return a fallback at the guard only if a validated checkpoint exists.
- A pilot pass on mega16 does not qualify it.
- The source, cohort, pool-ready/cold distinction and outer/inner concurrency must stay beside every timing.
- History/wire schema migration and generator/rating versions remain separate; timed results do not become
  canonical seed-cache entries.

## 5. Speed estimates: proposed common treatment

Do not average the analysts' projections. Keep the shared measured anchors, then the assumptions:

| Case | Opus's projection | Joint treatment |
|---|---|---|
| GT Master tail | About 5.5-14.5 s | Retain as a conditional late-attempt sensitivity. Four slow exact requests remain unclassified; no promised crossing of 10 s |
| Killer Master exhausted misses | About 4.2-11.0 s | Compatible with my sensitivity using the old x2.07-2.65 factors. Describe the request range, not a new measured p95, and retain the poor exact-hit rate |
| Killer Nightmare | Slow hits 5-16 s, plus K5 | Remove K5. Preserve the possibility that its p95 stays near 24.9 s when slow exact requests are single-attempt work; classify those requests before narrowing the envelope |
| mega16 Nightmare | Two-way maximum about 14 s; mean 4-6 with S5b | Conditional only. The slow pilot may be one attempt, and a 90% sample share can be one long sample. Record the consumed prefix before applying a sample-pool formula |
| Completed Hell 1 failures | Mostly x1.7-3.2 pool sensitivities | Broadly agree, as old-source capacity assumptions. No exact-hit gain is implied; a new source's future hit times are not bounded by these |
| mega16 Hell 1 | Still over 60 s | Label the conditional lower bound, but leave completed time, guard recovery and eventual exactness unknown |
| K2 | x1.2-2 kernel versus my x0.95-1.22 sensitivity | Do not choose a likely factor yet. A completely eliminated copy cost must be at least one-sixth of kernel time to yield x1.2, and half to yield x2, before trail overhead |

The useful common forecast is therefore modest: selective attempt pooling can shorten demonstrably
exhausted requests, but the actionable successful-request tails need attribution. There is no measured
current-source gain from K1-K5 and no new offerability forecast.

## 6. Owner decisions and remaining design choices

| Item | Proposed joint position |
|---|---|
| OD-S5 | Conditional acceptance of selective/lazy pooling, mandatory early-hit protection, per-request CPU as well as cold/ready wall, and device checks. No blanket 1.6x CPU promise |
| D10 / repair | A separately costed, narrowed task on the frozen source, followed by a priced measurement manifest. No need to repair obsolete frontier adapters solely to preserve the old package |
| SM5 timing | Design now, measure at the freeze by default. An earlier diagnostic is a separate owner-approved exception, not an inference from S5a's output equivalence |
| Hell 1 | Keep a bounded diagnostic role while the final tier and hits are unknown. Decide the scale of further latency work from the final catalogue; no bank shipment or design commitment before its root supply/verification is priced |
| S-OD7 | Hard/Expert withholding is decided. Record their raw final qualification separately; neither a speed gain nor a later qualifying result automatically re-offers them |
| Qualification | Apply existing Q02. Pin outer jobs in the task receipt; solo-request paired timing is the clean comparison, while any additional throughput/concurrency run is separately labelled |
| Experiment counts | Official qualification retains its protocol. A 20-request prototype cohort is not a replacement for the official 40-request first round. Approve staged diagnostics and final comparisons separately |

Remaining empirical choices, not source disputes: whether copy cost justifies K2, whether any depth-1 cache
has worthwhile reuse, and whether a frozen Hell floor diagnostic is worth its budget. The duplicate K5 and
the missing K4 pass-rate measurement are source/evidence corrections, not preferences to average.

## 7. Proposed merged questions for Fable

**Status convention:** *Agreed* means I accept the concern also raised by Opus; the exact merged wording
is proposed, not yet a jointly signed answer. *Astra-only* means it was not raised in Opus's phase-1 list.
This list replaces the two conflicting local Q19+ numberings for the proposed joint report.

### IG-S-Q19 — Agreed: scope of residual zero-hit Hell 1 work

After the final catalogue is known, does version 3 fund only a bounded diagnostic of persistently zero-hit
Hell 1 cells, or a full latency-optimisation programme even while they remain unofferable? What triggers a
bank/content decision?

Recommendation: baseline and profile first; scale subsequent work to a viable live/content route. Keep
rating changes with their owning feature and price a bank's verified root supply separately.

### IG-S-Q20 — Agreed: the retargeted frozen measurement package

Confirm the reduced package and its recorded fields: missing/current baseline, actual attempts and returned
origin, per-attempt/sample stages, width sweep with early-hit controls, selected profiles and S7 tails.
Which compatible final difficulty-v3 records can be reused, which new prototype population is authorised,
and what outer-jobs/inner-width receipt applies under Q02?

Recommendation: keep official qualification counts unchanged; distinguish a smaller diagnostic from the
paired confirmation; price a new manifest after repair. No automatic pre-freeze SM5 or old-budget carry-over.

### IG-S-Q21 — Astra-only: intrinsic units versus generator-only guard changes

Does section 9 supersede IG-S-Q03(b), or distinguish canonical finder semantics from generator-only quotas?

Recommendation: canonical findings, the intrinsic 50,000-unit semantics and the frozen rating cannot change
under a generator version. A deliberately new generator-only quota policy can be versioned separately,
with canonical verification retained. State that boundary before choosing a failed-parity fallback.

### IG-S-Q22 — Astra-only: the 1.5x whole-request kernel gate

Which target cells, statistic and comparator define the phase-3 factor? Is it against the same post-phase-2
generator, quotas and scheduler?

Recommendation: paired whole-request results on named targets, same scheduler on both sides, CPU and
cold/ready wall reported separately, plus non-regression controls. Do not count S5 twice or require a kernel
that a control never calls to speed that control by 1.5x.

### Mapping and retired questions

| Phase-1 question | Disposition |
|---|---|
| Opus Q19, 220/590 | Resolve as the documented headroom derivation or remove the illustration; no implementation-blocking new question needed |
| Opus Q20, qualification protocol | Existing Q02 answers the policy; exact invocation details join merged Q20 |
| Opus Q21, Hell route | Merged Q19 |
| Opus Q22, recording/population | Merged Q20 |
| Opus Q23, early SM5 | Default remains frozen; any exception joins the package/budget decision in merged Q20 |
| Astra Q19, version boundary | Merged Q21 |
| Astra Q20, kernel gate | Merged Q22 |

No joint report is written in this step. It follows after both cross-reviews exist.
