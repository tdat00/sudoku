# Plan version 3: independent analysis (Sudoku)

Astra (SA2), 2026-11-15. Phase 1; Opus's new analysis has not been read.
Start: 2026-11-15 19:09:46 +07:00.

Plan and companion-document snapshot: `2278b61`. Production-source facts were checked only with
`git show 75b99e6:<path>` in the Sudoku repository, never by reading its mutable working files.
No engine, test, generation, timing or benchmark run was made. Small read-only commands inspected Git
objects, references and recorded evidence. Only this analysis file is written in this repository.

**Verdict:** v3 incorporates the main joint conclusions and all six owner choices. It is substantially
clearer and smaller than v2. Two measurement-contract ambiguities and two low-severity factual/provenance
issues remain. There is no reason to reopen the rejected eager pool, the old mandatory Nightmare screen,
an early SM5 run, or the already-implemented K5 mechanism.

All line references to `plan.md` below are to v3 at `2278b61`.
**Measured** denotes an existing record, **Derived** arithmetic or a code implication, and **Analysis** a
design assessment. Projected time ranges remain assumptions, not measurements or confidence intervals.

## A. Fidelity

### A1. Every JV2 correction

| Item from the v2 joint report | Status | v3 line(s) | Assessment |
|---|---|---|---|
| JV2-S01: 1.6x CPU is not a bound | Taken in | 40-42, 152-153, 229-242 | Pair maxima and cohort-total distinction retained; selective enablement replaces eager pooling |
| JV2-S02: partial-S3 medians versus pair range | Taken in | 154 | 0.91-1.02 and 0.89-1.04 are distinguished |
| JV2-S03: full S3 and S4 were unbuilt | Taken in | 154 | No attribution of the entire old shortfall to S3 alone |
| JV2-S04: no literal 220-to-590 band widening | Taken in | 51-53 | Withdrawn; the unchanged band is stated |
| JV2-S05: retire representative 1,296/10x costing | Taken in | 52-53, 158 | The operative cost model is removed |
| JV2-S06: pool capacity is min(4,A), not eight | Taken in | 227-228 | Correct ceiling and serial fallback |
| JV2-S07: S6 needs a validated checkpoint | Taken in | 187, 244-251 | The checkpoint must already have been posted; initial full-grid timeout can still fail |
| JV2-S08: three failing adapters are not the full smoke result | Taken in | 337-342 | Stale frontier exposure, incomplete suites and missing puzzle parity are included |
| JV2-S09: Q was not 40 requests in every cell or a live-offer change | Taken in | 89-93 | 129 cells, 4,311 requests, early stops and expansion retained |
| JV2-S10: mega16 Expert has a 30 s budget | Taken in | 113-114 | Correctly treated as a hit-rate-margin cell |
| JV2-S11: missing GT Expert and unqualified mega16 pilot | Taken in | 106, 305, 308 | Both remain explicit; the broader controls sentence needs JV3-S01's small correction |
| JV2-S12: slow exact hits and consumed sample prefix | Taken in | 135-136, 287, 311 | No unqualified 10 s promise or S5b multiplier |
| JV2-S13: S-OD7 affects Hard/Expert only | Taken in | 70-71, 107-108, 454 | No in-v3 weight recalibration; Master/Nightmare kept apart |
| JV2-S14: no bank before the final catalogue | Taken in | 50, 196, 399-410 | Diagnosis first; a later priced route |
| JV2-S15: K5 already exists | Taken in | 200 | No new mask/MRV gain |
| JV2-S16: early architecture is not a measurement authorisation | Taken in | 240-242, 453 | No preliminary width sweep; enablement waits for results |

### A2. Joint answers and operative positions

| Joint position | Status | v3 line(s) | Assessment |
|---|---|---|---|
| Answer to 9.5 Q1: targets versus controls | Partly | 99-114 | Correct named cells; exclude classic4/classic6 from the phrase about all other non-Killer Nightmare cells |
| Q2: infer exhausted attempts only for completed misses | Taken in | 116-135 | Correct, and missing exact-request telemetry stays missing |
| Q3: no current Hell finder share; K1 footprints; K2 copies already pooled | Taken in | 163-176, 198, 269-272, 348 | No bankable kernel multiplier |
| Q4: actual floor versus all-chain proposal oracle | Taken in | 273-279 | Correct reference helper, diagnostic-only scope and canonical acceptance |
| Q5: retire obsolete screen; narrow and price a new round | Taken in | 38-39, 331-355 | Old full population is not automatically repeated |
| Q6: keep time, exactness and timeout recovery separate | Partly | 293-327, 360-364 | The speed table does this; outcome-reuse wording needs the completed/uncensored exception |
| Version/history/cache/recipe identity | Taken in | 203-215, 433-437 | Separate generator, rating and schema versions; stored puzzle rather than silent regeneration |
| Puzzle/keeper/event equivalence, not RNG forks alone | Taken in | 221-235, 431-432 | Killer's conditional count is explicitly in the audit |
| Guard-binding equivalence and native reference | Taken in | 163-176, 426-429 | Full checks, not only scores |
| S-OD7 raw final qualification versus withholding | Taken in by reference | 71, 108, 454 | The binding S-OD7 record must remain; it requires raw verdict and withholding to be shown separately |
| No reuse of an old allocation | Taken in | 333-335, 381-382 | No implied machine-time grant |
| Node is not browser qualification | Taken in | 295-298, 327, 494 | No new browser result is claimed |

### A3. Each v2 item and new candidate

| Item | Status | v3 line(s) | Joint disposition retained |
|---|---|---|---|
| Version/history/wire preparation | Taken in | 185, 207-215 | Pursue before the search version changes |
| S1 | Taken in | 193, 285 | Outside mandatory passing-cell scope; named-cell reopening only |
| S2 | Taken in | 156, 193, 285 | No standalone speed claim; parked with S1 |
| S3 | Taken in | 154, 194, 288 | Cheap scopes dropped as a speed item; chain work parked |
| S4 | Taken in | 189, 265-268 | Conditional prototype; changed log/refusal behaviour under the version |
| S5a | Taken in | 186, 217-242 | Selective pool, early-hit protection, CPU/device conditions |
| S5b | Taken in | 192, 287 | Consumed-prefix evidence and serial quota reference first |
| S6 | Taken in | 187, 244-251 | Posted validated checkpoint; timed history/cache rules |
| S7 | Taken in | 188, 253-261 | Total work including restarts; unknown outcome and wall backstop |
| S8 | Taken in | 195, 289 | Optional, full request identity, not free computation |
| S9 | Taken in | 196, 290, 399-410 | Owner route and priced roots; no pre-catalogue design |
| S10 | Taken in | 197, 288, 390 | Profile/gate first; JS fallback, intrinsic semantics |
| K1 | Taken in | 198, 288 | Park; completed depth-2 negative reads the open grid |
| K2 | Taken in | 190, 269-272, 391 | Profile first; new author threshold is explicitly 1.15 |
| K3 | Taken in | 199, 291 | Non-equivalent idea excluded from this feature |
| K4 | Taken in | 191, 273-279, 350 | Diagnostic only; no production filter |
| K5 | Taken in | 200 | Already present, no implementation/gain |

The pinned source confirms these main code facts: `tech-chain.js:643-680` reuses per-depth scratch and
checks the parent before its intrinsic cap; `digger.js:689-747` excludes all chains in the proposal oracle;
`difficulty.js:412-435` supplies `certifyFloor`; `combo-table.js:38-52` builds masks and
`dfs-solver.js:122-141` already implements MRV. No moving-source assumption was needed.

### A4. F0-F6 and the author's answers

| Item | Status | v3 line(s) | Assessment |
|---|---|---|---|
| Joint F0: attestation, narrowed repair and real parity | Taken in | 333-345 | Unsupported source stops; no old-engine fallback |
| F1: reconcile/reuse compatible baseline | Partly | 346, 360-364 | Identity/protocol restriction is present; qualify which outcomes can survive a concurrency change |
| F2: native/1/2/4, CPU, events, early-hit controls | Taken in | 347, 357-378 | A proposal to cost, not a run approval |
| F3: stage/family, caps, copy and check observations | Taken in | 348 | Sampling is explicitly not an equivalence proof |
| F4: successful and exceptional full-grid work | Taken in | 349, 253-261 | Retain a true total budget; an internal restart must not renew it |
| F5: conditional floor diagnostic | Taken in | 350, 399-410 | Independent of retired S1; still bounded diagnosis |
| F6: admitted prototype with a new costed plan | Taken in | 351 | No automatic kernel/sample-pool build |
| IG-S-Q19 answer | Taken in | 163-176 | Intrinsic versus generator-only contracts and reference-scan fallback |
| IG-S-Q20 answer | Taken in | 384-397 | Per-cell geometric mean, same post-phase-2 comparator; 1.5/1.15 and 0.95 copied. The answer's remaining metric ambiguity is JV3-S03 |
| IG-S-Q21 answer | Partly | 51-53, 472 | Both figures withdrawn. The promised 375-point Derived explanation is absent; no operative rule needs it, so do not reinsert history merely for completeness |
| IG-S-Q22 answer | Taken in | 357-364 | Outer jobs one, inner width four; serial control and throughput separation |
| IG-S-Q23 answer | Taken in | 399-410 | Diagnosis first; later hypothesis/price required |
| IG-S-Q24 answer | Taken in | 366-382 | Fields, proposed cells and 20+ costing copied; no official sample-count change |
| IG-S-Q25 answer | Taken in | 240-242, 453 | Wait for the freeze |

### A5. Every owner decision

| Decision | Status | v3 line(s) | Assessment |
|---|---|---|---|
| IG-S-D1 / OD-S5 (B) | Taken in | 229-242, 448 | Default enablement after frozen CPU/cold/ready results; phone-class check before mobile |
| IG-S-D2 / D10/A8 (B) | Taken in | 333-345, 449 | Narrowed repair after MS18e, separate cost, actual parity, price the round afterwards |
| IG-S-D3 / OD-S3 (A) | Taken in | 399-410, 450 | Hell diagnosis first, not a silently funded live/bank programme |
| IG-S-D4 (A) | Taken in | 357-364, 451 | Correct fixed paired/gate protocol; no active difficulty-v3 amendment |
| IG-S-D5 (A) | Taken in | 333-355, 374-382, 452 | F0-F6, stop/admission conditions, retired passing-cell screen/sweep, separately costed cohorts |
| IG-S-D6 (A) | Taken in | 240-242, 453 | No preliminary SM5 |

The Hell cells named for F2 confirmation remain a **proposal to cost after F1**, not a wider production
programme authorised by their presence in a table. The eventual manifest should identify F2's bounded
diagnostic purpose alongside the F3/F5 language of 5.5.

## B. New or remaining findings

Severity: **High** blocks a safe implementation/gate; **Medium** requires clarification before the manifest or
acceptance criteria are used; **Low** is a factual/editorial/provenance correction.
Counts: **0 High, 2 Medium, 2 Low**.

### JV3-S01 — Low — Measured: the controls sentence includes unsupported small-board cells

`plan.md:103` says the named variants "and the other executed non-Killer cells pass". The pinned checkpoint
has classic4 Nightmare **0/14** and classic6 Nightmare **4/18**
(`75b99e6:docs/difficulty-v3/qualification-checkpoint-2026-11-15.md:32-33`).
The qualifier's diagnostic matrix is broader than the offered real-tier population.

**Fix:** restore "the other executed non-Killer **real-tier** cells", or enumerate diagonalX/hyper/jigsaw9.
Keep mega16's pilot separate. Do not select failed diagnostic cells as passing controls by that sentence.

### JV3-S02 — Medium — Analysis: outcome reuse needs the timeout exception

`plan.md:362-363` says puzzles and exact flags do not depend on outer concurrency, permitting outcome reuse.
That is true of a completed uncensored deterministic request, not of its observed completion/on-time status.
The pinned qualifier explicitly counts timeouts/errors as misses
(`75b99e6:generator/tests/qualify.js:15-23`), and the plan itself retains a wall backstop.

**Fix:** permit reuse of the stored puzzle's intrinsic validity/exactness only for completed uncensored
requests with full semantic identity. Do not reuse a timeout as a proved non-exact outcome, or reuse hit
rates/qualification verdicts under another concurrency/guard protocol. Re-measure the missing timing or
guard outcome when needed. The completed-request qualification in lines 322-323 should also govern 5.2.

### JV3-S03 — Medium — Analysis: the kernel regression/CPU gate is not fully determined

`plan.md:389-393` says CPU may not rise and controls "must not be slower (ratio at least 0.95)".
The latter permits about **5.26% more time** when the ratio is reference/new. It also conflicts in wording
with the retained strict serial non-regression rule of Q02, lines 239-240 and the equal-result gate.

The primary statistic is defined as per-cell geometric mean of paired ready-wall ratios. It is not clear
whether CPU uses that statistic, ratio of cohort totals, a per-request condition or a confidence bound.
Those are not interchangeable (R3 already distinguishes median CPU ratio from ratio of totals).

**Fix / Q26:** explicitly scope the 0.95 tolerance to the kernel controls, explain whether it supersedes
strict serial non-regression there, and specify CPU's per-cell statistic and threshold. Keep cold wall
reported separately. This does not reopen the decided outer jobs or width.

### JV3-S04 — Low — Analysis: the evidence citations need a source revision, not a missing local path

The Q/chain-window references at `plan.md:31-32,97` are not present in the `2278b61` improve-generating tree.
They are available in the pinned rating-v3 history. The context says MS07e, but a reader following the
repository-relative path in this branch cannot reach the record.

**Fix:** use the named evidence path **at `75b99e6`** (or its original recorded revision) until source
preparation brings that history into the worktree. Do not silently substitute the moving main worktree.
The same archive discipline is needed for documentary inputs to the old reconciliation tool (section E).

### Gate arithmetic and other checks that pass

- The Amdahl expression is correct. At zero added overhead, factor 1.5 needs `f >= 1/3` in the ideal
  infinite-kernel limit and `f >= 2/3` for kernel x2. Positive overhead makes admission harder.
- K2's new 1.15 threshold is a deliberate author decision, not an unexplained change of the joint estimate.
  At x2 it needs about 26.1% eligible share; the favourable old 1.17 example is not a profile of this source.
- F0-F6 remain after the narrowed post-MS18e repair. The plan does not assign itself an old balance or a
  numerical machine allocation.
- S7 must return unknown/failure when the **total** budget is spent; `grid#a.k` may not reset that total.
  Existing Q07 supplies this rule; no new question is needed.
- The source of all measured times remains the checkpoint or R3. No new timing at `75b99e6` is implied.

## C. Before/after speed

All seventeen rows of v3 section 4 reproduce the v2 joint report's section 5, with the same measured source,
cohorts and conditional old-pool transfer. There is **no newly measured gain** and no substantive number
movement to price.

| Check | Calculation / evidence | Result |
|---|---|---|
| Generic exhausted examples | Old four/eight-attempt factors 2.07-3.43; e.g. classic9 Hell p95 8.069 divided by those endpoints | About 2.4-3.9 s, as printed; scenario only |
| Two-attempt example | Samurai Hell p95 37.925 / 1.96 and / 1.66 | About 19.3-22.8 s, as printed |
| Killer example | Hell p95 50.222 / 2.65 and / 2.07 | About 19.0-24.3 s, as printed |
| Killer Nightmare | Its 24.903 s p95 is an exact request with unrecorded attempt count | The broad conditional 9.4-24.9 s remains a sensitivity, not a measured p95 |
| mega16 Nightmare | Four pilots, mean 11.8; independent consumed work unknown | The 6-12 s mean scenario remains conditional; no S5b increment |
| mega16 Hell | Censored by the 120 s guard | Correctly unpriced; no divided-timeout forecast |
| Recommended mix | No admitted kernel gain yet | Correctly no additional priced factor |

Approximate endpoint rounding is not precision evidence: for example, using the unrounded slow Expert miss
10.2426 s and factor 2.65 gives 3.865 s (3.9 at one decimal), rather than the 3.8 obtained from the rounded
10.2 input. This is immaterial beside the stated transfer uncertainty; do not present these as hard bounds.

## D. Questions and decisions

### IG-S-Q26: Which regression and CPU rules bind the kernel controls?

**Context:** JV3-S03; v3 5.4 faithfully copies Q20's 0.95 wording but retains Q02's strict serial rule.

**Question:** Does 0.95 expressly replace strict serial non-regression for named kernel controls, and which
per-cell CPU statistic must not rise?

**Options:** (a) Ready-wall geometric-mean ratio >=0.95 on kernel controls, with a stated paired CPU
statistic >=1 and an explicit scope exception to strict serial timing; (b) strict >=1 ready-wall and CPU
non-regression; (c) a predeclared confidence/tolerance rule, with the statistic and bound specified.

**Recommendation:** make (a) or (b) explicit before evaluation; do not let an implementation choose between
median, geometric mean and total CPU after seeing data. This is an author protocol clarification, not a
request for another run.

**New owner decisions: none.** D1-D6 have been decided. Repair cost, the later manifest price, default/mobile
enablement and any new Hell route still require the receipts already listed in v3 section 7; do not invent
new IDs for those existing future decisions.

## E. Pruning proposal

No deletion or companion edit is made by this analysis. The safe archive reference for the present
companion-file versions is **`2278b61:<repository-relative path>`**; v1/v2 plan mechanisms are at `1437774`
and `adb7184` respectively. A commit-pinned textual reference is preferable to a broken relative link.

### E1. Companion files

| File/group | Keep / delete / trim | Reason and precondition |
|---|---|---|
| `report.md` | **Keep; trim only current-facing metadata after pinning its reader** | Its estimates/errata are still referenced by executed tasks and R3. The old reconciliation reads it by live path and tests exact lines; it is not just redundant prose |
| `plan-v2-joint-report.md` | **Keep** | V3 cites JV2-S01-S16, the cost/sensitivity assumptions and F0-F6. It is the compact settled record behind the new decisions |
| Both `1-analysis.md` files | **Keep for now** | Detailed evidence decompositions and code/contract arguments still underpin the old report and question origins. Do not delete them merely because their forecasts were superseded |
| Both `1-speed-summary.md` files | **Delete after the link fixes below** | They contain duplicate summary tables, with no unique binding decision or measurement. Their full basis remains in the kept analyses/report and at the archive commit |
| Both `2-cross-review.md` files | **Keep** | The old report cites particular derivations and reconciliations, not just their existence |
| Both `3-plan-v2-analysis.md` files | **Keep** | Source checks, current-source inference and detailed cost assumptions are not all repeated in v3 |
| Both `4-cross-review-of-plan-v2-analysis.md` files | **Keep** | They record concessions/corrections and why merged question numbers differ. The joint report names them |
| `clarifications.md`: questions/answers, direction/owner records, closure/approval conditions | **Keep** | Still-binding contracts and actual decisions; these are not replaceable by a plan author's summary |
| `clarifications.md:528-547` (interim status) | **Trim to a dated archive/R3 pointer** | No unique decision; interim "continues" / "will reconcile" status is superseded by the closed report. Keep the measured records it points to |
| `clarifications.md:597-615` (v2 summary) | **Trim to a one-line archive pointer** | Superseded narrative, including formerly pending owner choices. Retain the heading if any anchor depends on it |
| `evidence\` | **Keep all recorded bundles** | Raw records, budgets, revisions, firewalls, hashes, audits, failed/unstarted/censored receipts and smoke drivers explain the accepted round. R1/r2/r3 and frozen-rerun proposals are linked historical records, not disposable working drafts |
| `tasks\improve-generating\*` | **Keep as the executed/deferred pack, not the new plan** | Approval, exact population and stop contracts are provenance. IG-S06's deferred specification is part of why the round has no composed request evidence |

**Why the old reader matters.** `phase0\reconcile-errata.cjs:12-18,92-115` reads `report.md`, `plan.md` and
`clarifications.md` by path and searches old passages. `ig10-test.cjs:730-748` pins old line references.
V3 already removes some of those plan passages. I did not run that tool: the static dependency means its
historical reproduction must use pinned documentary inputs, or an explicitly revised reader, not pretend
the current plan is the old input. Pinning a historical **document** is not falling back to an old engine.

### E2. Required link fixes for the proposed summary deletion

| Referrer | Fix |
|---|---|
| `report.md:8` | Replace both live `1-speed-summary.md` links with each full path at `2278b61` |
| `claude-opus-5.5\2-cross-review.md:3-4` | Qualify both named speed-summary references with their archived paths/revision |
| `gpt-6-astra\2-cross-review.md:5` | Qualify the reviewed speed-summary reference likewise |
| `report.md:5` | Independently of deletion, its "Plan" reference means the historical v1 plan, not today's v3; pin `plan.md` at `1437774` |
| V3 Q/chain-window citations and the joint report's source list | Use the evidence path at `75b99e6`, not a nonexistent branch-local file |

A committed-tree reference scan found no external Markdown/script links to the speed summaries.
The evidence firewall snapshots **do list their historical filenames**. Those inventories must remain
byte-for-byte: they describe the tree at the run, not a live documentation link. Keep an archive-resolution
note in the retained report; do not rewrite inventories to make the new tree resemble the old one.
If cleanup requires changing a hashed evidence record, do not delete the companion instead.

### E3. Remnants inside v3 itself

| Exact v3 passage | Action | Proposed cut / retained substance |
|---|---|---|
| 3-9 | **Trim** | Keep the v3 identifier and authority links; replace the long revision narrative by one sentence with the two old plan commits |
| 11-13 | **Delete** | Retargeting history duplicates the operative goal and target table; deleting it also avoids the unqualified "Nightmare cells ... pass" wording |
| 35-54, section 0 | **Delete or replace by a three-line current overview** | All operative choices recur in sections 1, 3, 5 and 7. The withdrawal history is in the kept joint report and clarifications |
| 147-159 | **Keep** | Compact measured basis for the current pool choice and the non-crediting of other factors; history here affects present decisions |
| 178-291 | **Keep** | Dispositions, active mechanisms, excluded work and reopening conditions are current scope, even when they name retired items |
| 439-472 | **Keep, compact** | Owner status, future receipts and which answers remain binding affect implementation; not removable merely because clarifications records them too |
| 474-494 | **Trim repetition only** | Keep moving-source, CPU/device, zero-yield, gate, shared-state and browser risks. Old figures already in 2.5 need not be repeated verbatim |

No link fix is needed for plain section-0 prose unless a section anchor is referenced. Before execution,
replace any such anchor by the current operative section, not another historical summary.
Nothing in this pruning proposal removes a measurement, a decision, a task contract or a gate definition.
