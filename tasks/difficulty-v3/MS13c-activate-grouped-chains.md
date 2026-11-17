# MS13c — Activate grouped forcing chains

| Header | Value |
|---|---|
| Depends on | MS13b and the run-ahead MS14a accepted and committed; S-OD11 applies |
| Accepted implementation base | `ea14798` (MS14a); later pack-only commits do not replace this runtime baseline |
| Size / active time | Medium; 50-60 minutes plus E/GH/GP |
| Owner / milestone | Shared chains and both apps; M13 complete |
| Authority | R9/R10/R16/R20/R21; IR54; GC-01 option A / S-OD11 |
| Review | SA1 cross-review after the developer's final report and gates |
| Status | Candidate uncommitted; acceptance awaits JF-02 owner disposition and the reviewed fix/verification closure below |

## Goal & business context

Use the prepared graph and consumers together, with independently checked group proofs and no
claim of exhaustive Medusa/AIC/X-cycle coverage.

## Scope and repository rules

In: forcingChain/Long graph activation, owned proof data, affected examples/ratings/cost evidence.
Out: new IDs, changing selected C/depths, grouping XY-chain's restricted graph or weight fitting.
AGENTS/checklist, no Git/pack/log edits, complete B/E as affected.

## Inputs & context

R16, verbatim:

> Use singleton starting nodes for published forced/contradiction deductions; groups may be internal
> nodes and endpoint groups. A true multi-cell group is not permission to place an arbitrary member.
> An endpoint elimination must conflict with every member of each endpoint group.
> Each emitted Finding owns copied node/cell/path data, not borrowed mutable graph scratch.

Use MS13a canonical nodes/edges and MS13b proofVersion 2:
`chains:[[{cells:[...],digit,truth},...],...]`; length is maximum path edge count; Finding.cells
is the full sorted union. Pure singleton paths may retain triples. Same IDs/weights/orders/windows.
Never decode a new node as cell*digits+digit. An incomplete grouped construction or minimum search
cannot publish a grouped result or the best proof seen so far. The grouped attempt starts with
4096 additional nodes and one 50000-work allowance shared by construction and search, without a
reset between stages. **How that attempt composes with the accepted unbounded `forcingChain`
is decided by S-OD11: option A below is binding.** Only the short ID falls back after a local
grouped-attempt cap, under the same parent budget/window; its legacy search has no local work cap.
The once-only R10 adjustment applies to the newly introduced grouped limits, not to the fallback's
unbounded work policy, earlier XY/Nishio limits or selected C.

Independent checker validates every group member/edge/endpoint/target. Forced/contradiction starts
must be singleton; endpoint groups can eliminate only candidates conflicting with all members.
Regression vectors: one missed cross-peer; extra occurrence invalidating a strong group;
attempted arbitrary group placement; old singleton path retained after another call.
Current source anchors in `core/js/engine/tech-chain.js`: `pathData`, `findForcingChain`,
`findForcingChainLong`, `forcingWith`, `scanForcing`, `buildGraph`, `constructGraph` and
`SG.chainGraph.LIMITS`. Read the IR54 assertions in `core/tests/suites/tech-chain.test.js`,
including `keeps forcingChain unbounded where an accidental limit of 50000 would stop it`.

### S-OD11 — binding GC-01 option A

**Owner, Discord, 2026-11-17 04:30 (+07:00): "GC-01: chọn A."** The original question and
adjacent confirmation are in `docs/difficulty-v3/clarifications-resolved.md`, GC-01 / S-OD11.
The policy hold is lifted. Option B is not approved, and MS14a must still finish first.

The earlier escalation protected MS07b's IR54 contract: `forcingChain` explicitly retains
unbounded local work, subject to its window and parent budget/cancellation. Its odd-rings
regression (2001 and 5 cells) finds a three-link deduction beyond 50,000 units. S-OD11 preserves
that legacy route rather than imposing the grouped allowance on the whole short call.

1. **Grouped attempt first for both forcing IDs.** Resolve the same R9/caller-clamped
   windows; an empty/disabled window stays empty. Try the canonical grouped graph and
   minimum search, initially with 4,096 additional nodes and **one shared 50,000-work
   allowance**. Construction spends from it; search receives only what remains. No reset,
   singleton-first shortcut, board-specific bypass or partial grouped result.
   Publish a grouped-route Finding only with a complete graph and a proved minimum in its
   window. A completed negative or below-window rejection returns null without another search.
2. **Short-only fallback on an explicit local cap.** On a local grouped construction/search
   work cap or additional-node cap, `forcingChain` must, if the parent-budget check passes,
   discard the grouped scratch and run the accepted **complete singleton search**, with the same
   resolved short window and **`workLimit:null`** (the legacy private unbounded spec when
   calling that kernel directly). Do not accidentally inherit the seam's 50,000 default.
   Distinguish the termination reason; `Finding === null`, empty graph arrays, or work
   merely equalling a limit is not by itself authorization to retry.
3. **One parent budget, no recovery from its exhaustion.** Check the caller's budget before
   entering fallback and retain that same budget/deadline and cancellation throughout.
   Do not refund grouped work/time, create a fresh parent budget, expand the window, or
   turn parent-budget exhaustion into a local-cap retry. A spent parent budget gives no
   Finding under the existing contract; cancellation and non-budget errors propagate.
   Neither a completed negative nor a window rejection triggers fallback. The singleton
   route's own budget/error handling cannot trigger a second fallback or restart.
4. **Long stays bounded.** `forcingChainLong` has only the grouped attempt. Incomplete
   construction or minimum search returns null; no singleton fallback, extra allowance or
   relabelling of a short proof, including when the long ID is invoked alone.
5. **The minimum belongs to the graph actually searched to completion.** A grouped-route
   Finding certifies the minimum in the complete canonical grouped graph. A fallback
   Finding certifies it only in the complete singleton graph; it does not certify that the
   abandoned grouped graph has no shorter proof. Discard any best-so-far grouped candidate
   on truncation. Preserve deterministic tie/window behavior and copied proof ownership;
   never place an arbitrary member of a true group. Legacy triples remain permitted.
   Record the selected domain from control flow, not from whether the winning path happens
   to contain a group: a singleton-only path can also win a complete grouped search.
6. **Whole-call cost and evidence stay honest.** Record construction and grouped-search
   work, graph/minimum completion, local cap kind, fallback entry/result/work/latency,
   parent-budget outcomes, selected proof domain and total call work/latency. Keep phase
   caps distinct from the final call's outcome: a successful fallback is not a completed
   grouped minimum or a whole-call denial. The short call is **not** capped at 50,000;
   do not hide the first phase's cost or present only the successful fallback's work.
   Use the existing cost/evidence machinery; no new tooling/evidence class is authorized.
7. **No additional policy freedom.** IR54, IDs/weights/orders, selected C, caller windows,
   parent budgets and the other finders' limits remain. R10 permits one measured adjustment
   of the new grouped limits only; keep it separate from constants shared with XY/Nishio.
   This is an internal proof-search fallback, not the Generator's non-exact puzzle fallback:
   it does not itself change exactness, warnings, floors or qualification. Added grouped
   work still spends the parent budget, so unchanged puzzles, latency and wall-budget-limited
   availability are not promised. S-AV36 stays open for measurements and final audit.

Required closure remains independent proof checking, B/E/GH, both quick sets, CI and analyst
cross-review. Explain reference/wire/hash changes on final source, record both phases' costs
and apply final qualification normally. Any proposed widening of these fallback conditions
or a fallback for another finder would change S-OD11 and needs another owner decision.

### S-AV36 — grouped-graph construction cost and cap exposure

Origin: SA1's locked final-source MS13a review, relayed by the orchestrator on 2026-11-17 at
01:52 (+07:00), and the developer's corrected all-model census. Engine SHA-256:
`501481B415F1AD9B49D3BE355767C8922C5475FF2D93200A41DA1338705B9AEE`
(`docs/difficulty-v3/evidence/MS13a/engine-frozen.txt`, unchanged after E).
The corrected `docs/difficulty-v3/evidence/MS13a/census-all/table.md` and per-model JSONs retain
the populations; the earlier `work-census-final.json` is history, not a no-caps conclusion.

The following are **construction only**, before any grouped search, at the common 50,000 limit.
Ladder positions come from the propagated portion of
`H.randomStatesWithKnownSolution(m, rng(77003), 24)`: six seeded test-kit puzzles per model,
not a generated-puzzle qualification sample. Positions are where the ladder reaches the chain
group, not necessarily where a registered forcing ID would be selected. Diagnostic full-build
counts above the default cap are not the work actually spent by the capped default call.

| Model | Ladder positions over 50,000 / sampled | Full-build median | Full-build maximum |
|---|---:|---:|---:|
| Samurai | 38 / 48 | 85,352 | 138,529 |
| Sohei | 43 / 51 | 109,951 | 124,066 |
| Flower | 17 / 44 | 44,057 | 70,583 |
| mega16 | 20 / 321 | 23,349 | 57,089 |
| classic9 | 0 / 5 | 4,942 | 6,117 |
| mega12 | 0 / 32 | 6,971 | 13,644 |
| Butterfly | 0 / 15 | 26,658 | 31,008 |

Constructed blank maxima, kept separate: Samurai **1,715,391**, mega16 **1,209,344**,
Sohei **1,047,384**, Flower **459,297**, mega12 **321,048**, Butterfly **268,704**,
9x9 **84,807** (jigsaw9 **78,822**), classic6 **13,590**, classic4 **2,144**.
The largest blank has 2,214 additional groups, below 4,096; these are work-cap observations,
not evidence that the node quota must rise. SA1's real generated-wire observations are much
smaller: Samurai Nightmare G13 **6,764 and 1,708**, Killer G10 **660**. Do not pool these
with synthetic/blank populations; the census's Killer/Greater-Than test-kit models are
uncaged/uninequalitied, unlike a structured generated wire.

These counts demonstrate incomplete construction at many sampled large-board positions,
**not** a count of lost deductions, a future active-finder cap rate, or a GQ/GP verdict.
The inactive builder has removed no live deduction. MS13c owns the active cost/cap record;
MS18d carries the final cost disposition and MS18e audits it. Any measured generation/
availability consequence also goes to MS18c under the existing complete qualification.

**Use these data in the once-only adjustment decision; do not select a new number now.**
Construction counts alone cannot determine a construction-plus-search budget or a latency
trade-off. Under S-OD11, within this task's existing cost scope:

- Keep 50,000/4,096 as the starting configuration and the full source-qualified baseline.
  Reuse the labelled census inputs, and measure actual forcing/long call positions and the
  existing real-wire/fixture cases on activation source. Keep model, seed, preprocessing,
  position IDs, denominators, parent-budget failures and every cap visible.
- Account for setup time, construction work, search work, node counts and whole-call latency;
  also report fallback count/work/latency and total cost, not just the bounded
  grouped attempt. Distinguish graph completion, minimum completion, no deduction and cap.
- R10 permits at most one evidenced adjustment of these new limits, common to every board,
  before final E. Record before/after cap rates and latency, the chosen value or explicit
  decision to retain the defaults, and its rationale in the task record and v3 notes.
  No board-dependent limit, automatic rise to a blank maximum, changed work unit, extra
  per-stage allowance, another task's limit change or repeated retuning is authorized.
- Preserve the existing locked <=450-second admission / 540-second process ceiling.
  Keep unsafe or incomplete populations as named items; no new tooling/evidence class,
  qualification waiver or automatic broader campaign follows from this item.

### Serial scheduling retained after S-OD11 — 2026-11-17

The posted GC-01 question is archived unchanged with its answer. **MS14a is now accepted and
committed at `ea14798`; both dispatch prerequisites are satisfied.** The next order is
**MS13c -> MS14b -> MS14c**, after the completed MS14a preparation. One task/writer at a time;
no dirty-task parking, second writer or further run-ahead. Ready means dispatchable, not
implemented/accepted; the S-OD11 policy and final gates still have to be implemented and proved.

This preserves the active technique order, milestone completion order, limits, qualification,
review rules and full S3 scope. MS14a depends on the existing model/bit/unit APIs and remains
unregistered; it needs no grouped
chain result. MS14b registration still requires this task's acceptance. No new approval is
needed for this retained scheduling; the separate policy decision is now S-OD11.

### Accepted MS14a baseline and dispatch instructions — 2026-11-17

Start from **`ea14798`**, not MS13b. The final accepted measurements and fingerprints are in
`docs/difficulty-v3/evidence/MS14a/evidence.md` section 9 and its `quick-final/` results:

| App | Accepted tests / suites | Measured complete quick wall | Accepted fingerprint |
|---|---|---|---|
| Generator | **4,456 / 53** | **415.5 s** | `2e7fa7f86e4e795f1ceffec5d49f07c16e8d57da1665a63974874b0eaf1dba3e` |
| Player | **2,698 / 30** | **79.9 s** | `3b3bebdec3454e3b2fcf8a159a7b1ed87b99fab5c75640768d519b8588c5970a` |

Retain all **40 added shared subset tests**, `core/tests/fixtures/jigsaw-models.js`, both HTML
fixture entries and the inactive `SG.leftoverPatterns` kernel. The baseline `core-shared`
shard has 2,144 tests and **110 seconds** projection; `own-fast` stays 320 and the Player job
120. Preserve the rest of the accepted manifest. MS13b's 4,416/2,658 totals and the old
core-shared 100 projection are history, not values to restore.

Derive final inventories/fingerprints from this task's changed source, update affected guides/
designs before the quick fingerprint, and maintain projections under the existing measured
rule. Do not copy an earlier whole guide/manifest/source file over MS14a's additions or omit
its tests. These are baseline measurements, not promised MS13c timings or fingerprints; use
current projections and the existing 450/540-second admission/process bounds for final runs.

MS14a completed fresh 5-wire/14-analysis/520-hash E and GH 37/37, all check-only with canonical
values unchanged. Its ledgers are the accepted baseline, not this activation's evidence.
MS13c still owns fresh full activation E on its final source, including the accepted MS14a
code, plus B/GH/quick/CI and SA1 review. Preserve the version-2 event/replay/wire round trip
below; no predecessor gate is deferred or substituted.

**Living chain documentation is owned here.** When activation lands, update the stale
GC-01-open/inactive-forward-looking sentences in `generator/design.md`, `player/design.md`,
`DEVELOPERGUIDE.md` and `DEVELOPERGUIDE.vn.md` to the implemented S-OD11 option A and the actual
selected grouped limit. Describe the short fallback's separate singleton minimum domain,
same parent budget/window and unbounded local work; the long ID has no fallback. Mark MS13a/
MS13b measurements and inactivity statements as historical at their sources, not present
behavior, while keeping their old numbers/evidence intact. Do not rewrite accepted task logs
or the owner archive. Make these living-doc changes before the relevant final fingerprints.

**Carry S-AV37 without taking its implementation scope.** It is the newly numbered MS14a
leftover-layout cost item, owned first by MS14b. Leave that kernel unregistered and its
2/4/50,000 limits unchanged; do not activate it, give it S-OD11's fallback, tune it or launch
a Jigsaw-layout campaign from MS13c. Keep S-AV36 and S-AV37 distinct and return both with the
inherited item list. This item introduces no new MS13c gate or dispatch stop.

### Final-report rulings — SA2, incorporating SA1's review, 2026-11-17

These are rulings on the uncommitted candidate on `4aa3d11`, engine SHA-256
`5EBA1AE580D5F63AD0A1B2DA0FCC4CAD0C515C297C9391C691D4CB58626AC9D1`.
SA1 found no engine/test defect and verified S-OD11, E, GH and the final quick fingerprints.
This is **not acceptance yet**: JF-02 below is an owner-authorization blocker, independent
of the numerical performance findings and the non-blocking report/doc corrections.

1. **Q1 — accept the constructed falling-new-hardest unit vectors.** The current real G12
   position stays pinned as 2,977 -> 2,169, Nishio -> Forcing Chain, with `newHardest:false`
   and no new-peak explanation. The explicitly copied/altered rating and transition are
   unit inputs for the builder/renderer branches, not a new real generated golden.
   Keep those real negative-premise assertions, the constructed positive assertions and
   the original fixtures unmodified by the test. The scan establishes absence only among
   the fourteen current goldens/both views, not impossibility in every puzzle.
   Describe the coverage honestly: the branch remains tested, but its former real falling
   witness is now constructed. No broader discovery or new test is required by this ruling.
2. **Q2 — accept the two real multi-move cases, as reviewed by SA1.** Keep every existing
   multi-move assertion for G10/G12 and the current real G07 position/new single-culprit
   truth. Record the change of premise and point to its retained assertions; do not call
   G07 a multi-move witness, invent a third one or relax a matcher to accept both classes.
3. **Q3 — accept retaining 50,000 / 4,096; correct the rationale per ID.** In the measured
   710-position activation-ladder cohort, 200,000 changes short/long caps **310/313 -> 2/1**
   and Findings **213/115 -> 323/254**, while combined warm call latency is
   **1,990 -> 2,305 ms (+16%)**. The short default has an uncapped singleton fallback
   only while its parent budget permits; the long default loses those capped deductions
   and has no such protection. Report both the coverage gain and cost, not only the cost.
   Retaining the approved starting bound is permitted; no adjustment is required merely
   to eliminate caps. Repeating E/quick sets is a consequence of changing the selected
   source, **not** a performance/coverage selection criterion. The candidate's whole-
   generation effect is unmeasured: fixed-position finder latency is not generation time.
   Claim no optimality, preserved long coverage or unchanged wall-budget availability.
   No adjustment was made; this is not a transferable future tuning permission.
4. **Q4 / cost — record S-AV38 and inform the owner now; no new decision is required solely
   for the slowdown.** S-OD4 permits continued work with truthful numerical items.
   Keep all targets, guards, offers and S-OD11 unchanged. A change to grouped-first order,
   fallback conditions or another recorded policy would need a separate owner decision.
   Do not treat the owner notification as a waiver of final qualification/performance.

   Separate the evidence populations:

   | Population | Source-qualified observation | Meaning |
   |---|---|---|
   | Five paired 50-run cells, same recipe/seeds | p95 base -> candidate, ms: classic9/nightmare 3,061 -> 4,902; diagonalX/nightmare 7,693 -> 16,534; wordoku/nightmare 1,624 -> 3,371; mega12/nightmare 5,485 -> 8,396; killer/hell2 8,806 -> 14,528 | About 1.5-2.2x on these five cells only. The first four already missed their targets; Killer Hell 2 changes from meeting to missing. |
   | Butterfly Nightmare, 50 runs | p95 24,335 ms against 8,000; no paired base-50 result | A current miss, not proof of a newly introduced target miss without the baseline. |
   | Two-run diagnostics | observed maxima base -> candidate, ms: hyper/nightmare 658 -> 19,543; jigsaw9/nightmare 4,272 -> 22,283; greaterThan/nightmare 6,931 -> 11,450 | Large warning signals, not population p95 estimates or completed 50-run GP verdicts. The Greater-Than 50-run command subsequently timed out. |
   | One G13 wire request, SA1's paired observation | Samurai Nightmare seed 42, about 11.0 -> 94.2 s, about 8.6x; the new puzzle/attempt history differs | Re-measure S-AV04 and link S-AV38. Above the 30 s qualification reference and near the 120 s guard for this request, not a qualification percentile/verdict. |

   The comparator is the accepted MS14a chain engine (`4aa3d11`/`ea14798`), **not `main`**.
   Same seeds do not mean identical delivered puzzles/dig paths. These observations do not
   fulfil or extrapolate the owner's requested comparison against an immutable `main`
   baseline. Describe them as local, single-machine observations with their sample sizes.

### GP completeness and evidence corrections

**Accept partial intermediate GP closure under S-OD4 after the accounting is corrected;
do not claim a complete/passing GP matrix.** No additional unsafe timing campaign is required
before this task's commit. The full final offered-matrix obligation remains with MS18d.
Any omitted cell for which a credible current-source <=450-second admission is actually
available still follows the existing measurement scope; otherwise preserve the explicit
unmeasured gap rather than invent a bound or launch speculatively.

Account for all **50 affected cells**, not just the 37 rows in `gp-table.md`:

- **21 complete 50-run records:** 15 meet, six miss. Verify actual completed outputs, not
  just `--runs=50` arguments; the greaterThan/nightmare timeout is **not** one of these 21.
- **16 with a complete two-run pilot but no complete 50-run record:** fifteen were withheld
  by their pilot-based projection; greaterThan/nightmare was admitted at 440 s and aborted
  at 540 s. Retain the failed command separately from its valid pilot.
- **13 without a complete pilot:** twelve unpiloted Samurai/Sohei/Flower cells and
  mega16/hell1, whose pilot was attempted twice and timed out. Do not turn missing/partial
  request data into zero-cost samples or completed outcomes.
- The brief's **mega16/easy 50-run control** passes separately; it is not an affected cell
  and must not inflate the 50-cell denominator.

Add request/protocol, count, source, status, target, measured/projection basis and evidence
links for every row. Pilot columns must be labelled **two-run diagnostic maxima, no GP
verdict**, without GP pass/fail ticks. Keep raw tool output intact. Do not compute a full
aggregate from the measured subset or call these records complete release performance.

Correct the planning disclosures, without another timing run solely to repair prose:
the target was not an upper bound. The retained ledger has **10/37 completed pilot items
over projection** (by both numeric values and flags); mega16/hell1's two aborted attempts
are additional. Reconcile the review's 11/37 shorthand without mixing those denominators.
The completed GP ledger
also has **seven** `withinProjection:false` items, plus the aborted greaterThan/nightmare
command. The G13 observation is not a measured 4,750-second projection for every level of
Samurai, Sohei and Flower: replace those cross-cell claims with cell-qualified evidence or
an explicit unknown/unmeasured basis. A failed two-run pilot does not establish a measured
50-run duration of 13,500 seconds. Preserve the actual timeouts and do not repeat unsafe
commands on the unchanged assumptions.

### Reviewed fix list and rerun boundary

**Safe now, outside the two quick fingerprints; no rerun solely for these corrections:**

- **SA1 finding 2:** record **73 detected + 8 argued-equivalent** mutants. Add SA1's
  dominance/order arguments for S01/S03/S06/P09 beside A20/S05/E08/E09; retain the guards,
  output sort and original runs. Drop the proposed mutant S-AV item: no missing test or
  unresolved mutant is claimed after SA1's disposition. Negative random searches are not
  the equivalence proof. All 81 fragments match final source; retain the disclosure that
  the executed mutation runs preceded the stop-label rename.
- **Finding 3:** remove the false claim that `census-run.js` checked agreement. It measures
  cost/caps. Separately cite the suite checker and SA1's locked 16.3 s review sweep:
  all 15 models, six seeded puzzles each, **684 forcing positions, 306 Findings, 178 v2**,
  zero checker problems and zero conflicts with known solutions. Cite SA1's actual retained
  artifact/review reference, not an invented path. This is soundness/proof-checking evidence,
  not exhaustive first-pattern or missing-deduction enumeration; shortest/window evidence
  also rests on its tests and the reviewed search. No new enumeration campaign is required.
- **Findings 4 and 8:** correct `evidence.md` and `notes.md` with the populations and per-ID
  limit trade-off above. The observed per-call range is **5-25x in pre-freeze measurements**,
  not 5-20x or a final-source/main generation estimate. Carry S-AV04, S-AV08, S-AV36,
  S-AV37 and new S-AV38 with the full inherited list.
- **Finding 5:** disclose the missing stopped-quick row as a clearly manual aborted record,
  with available command/session/PID evidence and unknown quantities left unknown.
  Record the unreported stale-lock removal, the faulty pilot bounds, unchanged mega16/hell1
  retry and the first-E overruns: G13 wire **97.4 s vs 46 s**, diagonalX-nightmare-05
  **45.6 s vs 37 s**. Keep the final E's valid 123 admissions separate from that history.
  The orchestrator confirms Pentomino PR #10 was finished/merged long before MS13c and
  **was not blocked at 09:46-09:57; there was no other dv3-lock user**. Do not attribute
  waits to Pentomino/external holders; identify owned holders where recorded, otherwise
  say unknown. In timeout rows the error dominates a stale `exit:0`; none is an automated
  pass. Preserve raw rows and add the interpretation/correction, not invented timings.
- **Finding 6, cheap part:** correct only the stale inactive-grouped-graph description in
  `docs/architecture.md`. This tightly coupled living-doc correction is assigned here.
- **Finding 7:** state that the illustrative `MS13c/sources.json` GH command was not run:
  both forcing IDs still use their own catalogue sources, none of those entries is v2,
  and the real v2 normal Player hint is pinned in `play.test.js`. This is accepted coverage;
  no new catalogue entry, count change or discovery is required by this ruling.
- **Nits:** correct the repeated header words in `engine-final.txt`, without changing any
  recorded hash/time. Correct the `.last-release` deletion claim to its actual state; keep
  the owned coordination marker until final commands are done. List the `'window'` ->
  `'empty'` rename and associated expectation edits; the old hash alone is not a retained
  source blob or a reproducible diff. Do not invent one. Correct the GP table/projections
  above and label Jellyfish acquisition **authorization pending JF-02**, not covered by S-OD10.

**Wait for the owner, then make one coherent fingerprinted fix pass:**

- Apply JF-02 A or B exactly. Under A, keep the already verified Jellyfish snapshot and
  record the retroactive disposition without pretending the scan was authorized beforehand.
  Under B, restore **only that entry** from the accepted pre-MS13c catalogue, preserve the
  other six legitimate refreshes, and use the ordinary authorized source route. Do not
  launder the refused source as a newly "known" ordinary source. If ordinary acquisition
  fails, GH remains 36/37 and acceptance stops for the owner.
- Fix `generator/design.md`'s cost range/source qualification and `player/design.md`'s
  fallback description: no local fallback work cap, same parent budget/window, minimum
  only in the singleton graph. Correct its Jellyfish authorization wording according to
  the actual owner answer. Check corresponding living EN/VI statements for consistency.
  Preserve historical measurements; do not weaken S-OD11, targets or counts.
- With all selected snapshot/doc changes finished, complete GH `--check`, rerun **both
  complete quick sets** once on final fingerprints, and check/update CI projections under
  the existing rule. Do not run twice merely to separate the two doc corrections.
  Report actual fingerprints/counts/times. Existing E remains applicable if its included
  source bytes are unchanged; retain current-source merge checks, do not rerun or retag E
  merely for a doc/owner-record edit. Any actual engine-source change invokes the ordinary
  full E/source-refresh rules and affected verification.

Q1/Q2 are now accepted as reviewed; Q3 retention and Q4 numerical reporting needed no new
policy choice. Writing `QUESTION:` is not permission to extend a recorded authorization.
The acquisition in JF-02 should have stopped before the unauthorized scan. No later serial
task is dispatched until MS13c's owner disposition, fixes and acceptance/commit are complete.

### JF-02 — owner question: MS13c Jellyfish acquisition and a future standing rule

**Decision needed; no answer assumed.** S-OD10 authorized the corpus route for **MS12 only**
and explicitly said no other task inherits it. MS13c nevertheless used that route without
stopping for approval or running ordinary Generator discovery first.

**Evidence.** After the saved/catalogue sources failed, MS13c materialized **10,000**
classic9 seed-4242 puzzles (40,000 test-kit states) once, then replayed indices **0-8,703**
in **136 chunks of 64** through the normal Player tool. The first successful chunk supplied
`testkit-4242-8657`; the updated catalogue passes **37/37**. The replay/hint/time/lock
bounds and complete ledger were kept; acquisition authority was not. Evidence is under
`docs/difficulty-v3/evidence/MS13c/`: `logs/gh-corpus-materialize.txt`, `jellyfish-scan-chunks.jsonl`,
`logs/gh-jellyfish-scan-1.txt`, `logs/gh-write-jellyfish.txt` and the final GH check.
No more corpus acquisition is authorized while this question is pending.

**Question 1 — this completed MS13c use:**

- **A — approve it retroactively, for this task only.** Permit retention of the verified
  source `testkit-4242-8657` and the completed acquisition record. Preserve the disclosure
  that S-OD10 did not authorize it at execution time. No further scan, budget reset, changed
  finder/prior/target, fabricated example or GH/quick/release waiver follows.
- **B — refuse.** Restore only the old Jellyfish catalogue entry and use the ordinary
  authorized source/discovery route, accounting for attempts already made. If that cannot
  supply a current normal-hint example, GH is 36/37 and the task remains blocked for the
  owner. Do not discard the unauthorized-run evidence or weaken the replay test.

**Question 2 — independently and optionally, later active tasks:**

- **S0 — retain case-by-case approval** (the current/default rule). An answer A alone
  approves only MS13c; it creates no standing exception.
- **S1 — authorize a narrow standing fallback for Jellyfish only.** In a later active task
  whose change invalidates that existing example, first exhaust its own source, other
  catalogue/known unique fixture sources and the ordinary bounded B discovery route.
  Only then may that task use classic9 test-kit seed **4242**, original givens, level null,
  `testkit-4242-<index>` provenance, indices **0-19,999 ascending**, at most **20,000**
  attempted candidates across all its fix rounds. Reuse/materialize the prefix once and
  account for construction; never regenerate it per chunk or reset the task allowance
  after a source edit; repeated candidate replays consume the same allowance. Use the
  existing Player replay, chunks <=64, <=400 hints/puzzle,
  the eight-minute tool deadline, credible <=450 s admission, 540 s process ceiling and
  existing lock/15 s gaps. Stop acquisition after the first completed chunk supplies a
  verified source. At exhaustion, incomplete/unsafe execution or failure of ordinary
  acquisition before that precondition can be met, stop for the owner rather than enlarge
  a bound. Finish normal GH and final quick/CI gates. This covers neither another ID,
  initial acquisition of a new ID nor another variant, and adds no new tooling class.
  S1 begins with tasks after MS13c; it does not overturn a B refusal for the current task.

**Recommendation:** A for the completed, bounded, verified MS13c source; S1 if the owner
wants to prevent repeat Jellyfish-only interruptions while retaining explicit limits.
Choose A/B and S0/S1 separately (for example **"JF-02: A + S1"**). Neither is inferred here.
An answer to question 1 alone resolves the current use and retains S0; do not hold this task
for an optional standing-rule answer or infer S1 from a bare A.
The performance update is information under S-OD4, not bundled approval of the slowdown or
permission to change S-OD11. All other acceptance requirements remain.

## Files to create/modify

- Chain engine/suite and proof fixture helper; B's current chain fixtures/references, help/locales
  and real examples; E.
- Both designs' chain/proof/limitations sections and both language guides; v3 notes.
- The tightly coupled active-chain description in `docs/architecture.md`, as assigned by the review fix list.

## Implementation steps

0. Capture the accepted `ea14798` source/inventory baseline above, retaining MS14a's additions.
   Implement S-OD11 option A only; the archived alternative is not an implementation choice.
1. Connect the canonical graph to forcing/Long only, replacing every arithmetic node assumption.
2. Emit owned mixed proofs and validate them independently; keep registered windows enforced.
3. Refresh current reference/example data and living EN/VI guides/designs. Replace pending-GC-01
   wording with S-OD11, distinguish the bounded grouped attempt from the uncapped short fallback,
   and document the proof domains and non-exhaustive coverage without changing other policies.
4. Record S-AV36 construction/search counts, cap and approved-fallback outcomes, real GH and
   affected GP cells; decide any permitted adjustment before final E/quick sets.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS13c-B01 | Every grouped deduction is sound and truthfully displayed |
| MS13c-B02 | Bounded grouped coverage and the unbounded-local-work short fallback are described truthfully, not as all Medusa/AIC |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS13c-T01 | All-member edges/targets, singleton placement starts and shortest windows hold |
| MS13c-T02 | Buffer bounds, S-OD11's exact cap/fallback policy and proof domains, stage accounting, cancellation and retained proof ownership pass |
| MS13c-T03 | B/E/GH, S-AV36 cost/limit decision and GP records and both quick sets complete |

## Test plan and gates

Generator `node tests\node-runner.js --suite=tech-chain,techniques,technique-weights,difficulty-floor`;
Player `--suite=play,i18n,help`; both quick sets. Add focused regressions for construction work/
node exhaustion, search exhaustion after a candidate but before its minimum is proved, the exact
shared-limit boundary/no reset, and parent exhaustion versus local cap. Retain the existing
singleton deduction that uses more than 50,000 work units: with ample parent budget, the short fallback
must match the accepted uncapped singleton seam's deduction, proof paths and minimum length on
the same state and window; verify the full sorted cell union separately. Do not impose the
grouped cap on that route or count only its work. Preserve a complete grouped proof
shorter than its singleton counterpart, long called alone, narrowed/disabled caller windows and
retained Finding ownership. Keep IR54's legacy policy/seam coverage. Test all local-cap fallback
paths, no fallback after parent-budget exhaustion/cancellation/error/completed negative/window
rejection, and no long-ID fallback. Account for both stages; never label a fallback a grouped
minimum or infer the domain from a singleton-only winning path.
Round-trip a real grouped version-2 Finding through step events, replay and wire serialization/deserialization, asserting unchanged `i18nArgs.proofVersion`, nested node/path data, proof cells, placements and eliminations; the error-only depth-4 `toPlain` truncation must not affect this successful path.
Complete E MS13c:

```powershell
node tests\perf.js --hash-key=classic4/veryEasy --hash-from=0 --hash-count=5 --hash-record=..\docs\difficulty-v3\evidence\MS13c\hashes\classic4-veryEasy-00.json
node tests\replay-goldens.js --ids=G01 --record=..\docs\difficulty-v3\evidence\MS13c\analysis\G01.json
node tests\pattern-cost.js --ids=forcingChain,forcingChainLong --runs=20 --json=..\docs\difficulty-v3\evidence\MS13c\pattern-cost.json
node tests\perf.js --variant=classic9 --level=nightmare --runs=50 --warmup=0 --seed=7000 --gate
node tests\perf.js --variant=mega16 --level=easy --runs=50 --warmup=0 --seed=7000 --gate
```

Player GH:

```powershell
node tests\tools\make-technique-examples.js ..\generator --ids=forcingChain,forcingChainLong --sources=tests\artifacts\difficulty-v3\MS13c\sources.json --max-puzzles=16 --max-hints=400 --write
node tests\tools\make-technique-examples.js ..\generator --ids=forcingChain,forcingChainLong --sources=tests\artifacts\difficulty-v3\MS13c\sources.json --max-puzzles=16 --max-hints=400 --check
```

Curated chain sources first, then bounded classic9 master/nightmare/hell1 under B.
Jobs 1/no --jobs. E 10-90 minutes, cost 1-60 seconds, GP 30-540 seconds/cell, curated GH 1-120 seconds.
**Announce to the orchestrator before starting (pentomino runs in parallel on the same machine).**
Record GP misses, never relax targets; 540-second process ceiling.

## Definition of done & handoff

Return the implemented S-OD11 policy, proof-domain/limit records, S-AV36 disposition and complete inherited/
new item list, real grouped example, reference changes and cost misses. No hidden group activation
or unapproved fallback remains for later tasks; MS18d owns the final cost disposition, MS18e its
audit, and MS18c any measured availability consequence.

## Resume rules — S-OD4

Review: analyst cross-review. Stop for correctness/evidence corruption or changing a recorded
decision; performance/availability is a named numerical item for MS18c/MS18d and work continues.
Use `Invoke-Dv3Node` for all possibly >10-second payloads, <=540 s; project GP before launch
and retain an unsafe/unmeasured cell as an item, not an automatic new tooling task or dropped case.
Both quick sets use the current bounded manifest; any added suite owns its r6c CI group.
Return the inherited/new item list, complete applicable B/E and truthful cost verdicts.

## Execution log

| Field | Value |
|---|---|
| Status | |
| Start | |
| End | |
| Duration | |
| Model | |
| Token usage | |
| AI credits | |
| Verification | |
| Acceptance | |
| Issues & resolutions | |
| Handoff | |
