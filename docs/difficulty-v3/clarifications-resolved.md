# Rating v3: resolved clarifications (archive)

Moved from [clarifications.md](clarifications.md) on 2026-11-13 at the owner's request. Every question in this
file is resolved: answered by the plan author or decided by the owner. Ids and part letters are unchanged, so a
reference such as "clarifications.md Part H" in a task file or a record is found here. PR-S1 and CV6-03 were
moved here unchanged after Fable's 2026-11-13 answers. The questions that still
need the plan author's answer are in [clarifications.md](clarifications.md); when one is answered, it moves here.

---

Status: **answered, 2026-11-12** by the plan author (claude-fable-5-2); the two disputed rows were decided by the owner on the command line. Summary of the decisions: part E at the end of this file. Questions raised by the two analysts who reviewed `docs/difficulty-v3/plan.md`
against the code (branch `rating-v3`, commit `6abcb9f`), for the plan's author (claude-fable-5-2) to check and
answer. The owner confirms the answers before they become decisions.

- Analyst SA2 (gpt-6-astra): `docs/difficulty-v3/gpt-6-astra/1-report.md` (questions in its section 5.2).
- Analyst SA1 (claude-opus-5.5): `docs/difficulty-v3/claude-opus-5.5/1-report.md` (questions in its section 5.2).

Fixed and not open: the decisions of plan section 1.3 (rating version 3; a puzzle of level L must need a
technique of L's tier, one such step is enough; scores spread across the band; current weights kept unless a
later calibration says otherwise), the full scope S0-S3 with all six S3 groups and S2.3, and the APPROVAL GATE
runs (pre-approved by the owner; the task that needs a gate runs it).

How to answer: under each question, fill **Answer** with the chosen option (or your own) and a short reason.
If a question rests on a wrong reading of the plan or of the code, say so in the answer. The status table below
says which questions are still disputed between the analysts. Part D lists the analysts' corrections to the plan
itself; mark any you disagree with.

---

## Status after the joint report check (2026-11-12 09:50)

The co-signed joint report is `docs/difficulty-v3/report-detailed.md` (lead SA2, checked by SA1 in
`docs/difficulty-v3/claude-opus-5.5/4-check-of-joint-report.md`; all 11 required changes applied). Please review it
together with this file. Each PENDING item of the report names its branches and the question below that decides it.
The responses that led here are `docs/difficulty-v3/claude-opus-5.5/3-response-to-review.md` and
`docs/difficulty-v3/gpt-6-astra/3-response-to-review.md`. Answer the **disputed** rows first. For an **agreed** row a
one-word confirmation is enough. Rows marked "for the plan author" are author or implementer contracts rather than
owner policy. New questions are in part C.

| Question | SA1 final position | SA2 final position | Status |
|---|---|---|---|
| SA1-Q-S4 / SA2-Q-S03 target beyond the guided dig | guided dig first; extend to refine / local search only if Expert's median band position stays above 0.75 | one target per sample through guided dig, refine and local search; a conditional trigger needs a fixed sample, an exact-hit and timing comparison, and a re-check after S3 | **disputed** |
| SA1-Q-S1 / SA2-Q-S04 chain window | measure ≤ 6 and ≤ 4 on fresh puzzles; keep the window with the higher exact-Nightmare rate; ≤ 6 on a tie | measure ≤ 4 and ≤ 6 on fixed and fresh puzzles; both window bounds enforced inside each id | **for the owner: approve the selection rule** (the measurement is agreed) |
| Nightmare numbers (facts) | ≤ 6: 0 of 12 exact Nightmare; ≤ 4: 6 of 12 need the long chain, 2 of 12 stay exact Nightmare, 4 become shallow Hell 1 | the same | agreed |
| `nishioDeep` depth | default 2 | default 2, depth 3 only when asked for explicitly | agreed |
| SA1-Q-S7 derived `required` | yes, for complete canonical `rate()` results after S2.1; `certifyFloor` is the reference | accepted with the same boundary (identical finder options, uniqueness proof kept; other ratings use the reference); verified 39 of 39 | agreed, for the plan author to confirm |
| SA2-Q-S02 floor-solve cap | no second solve in generation | withdrawn if the derived mechanism is adopted; reference failures stay explicit | agreed |
| Guided-dig oracle `tierUsed` | a steering proxy only | heuristic (uniqueness flags differ) | agreed: steering proxy, not a certificate |
| SA2-Q-S12 extra shallow-search budget | (c) a measured cap; 128 withdrawn | (c); the existing caps until a number is chosen | agreed: (c) |
| PROC-S1 step order | baseline and tooling, S2.1, S1, S2.2, S3, version and final evidence | the same | agreed: (a) |
| Qualification timing | after S2.2 and at the end | first after S2.2, final after S3; earlier runs are diagnostics only | agreed |
| Hashes, goldens, help examples | regenerated in the task that changes output | the same; heavy qualification consolidated | agreed |
| SA2-Q-S01 veryEasy | singles tier, vacuous certificate | the same, null floor level | agreed: (a) |
| SA1-Q-S2 Easy needs its tier | yes | a fixed-decision consequence | agreed: (a) |
| SA1-Q-S3 / SA2-Q-S06 warnings | both warnings plus `tune.shallow` | both warnings plus an explicit shallow event or status text | agreed: (a) |
| SA1-Q-S5 levels no longer offered | accept the final qualification | the same; no pruning from intermediate runs, no silent weight change | agreed: (a) |
| SA1-Q-S6 / SA2-Q-S07 history | a version field in new history entries; old entries say "made by an earlier version"; no floor export | the same | agreed |
| SA2-Q-S05 pattern limits | documented limits from bounded measurements | the same | agreed: (a) |
| SA2-Q-S08 base costs, ALS group | positive increasing costs; `chain` | an exact positive cost table from the plan author; `chain` | for the plan author |
| SA2-Q-S09 Killer cage interaction | `cageCombo` plus a quick regression | the same | agreed: (a) |
| SA2-Q-S10 reference labels | the plan says adjust the new weight (plan lines 507-508) | keep the v2 labels as history, add v3 expectations, no weight change | **for the plan author** |
| SA2-Q-S11 help examples | curated real puzzles | the same, bounded deterministic tooling | agreed: (a) |
| `tech-subset.js` check counter | reset per call | localise it when the bounded catalogue work lands; the existing objective guard already depends on it | technical, settled in the joint report |
| AUTH-S1 (new, part C) qualification record | update `docs/difficulty-rating/qualification.md` (the live table) | a new `docs/difficulty-v3/qualification.md` | **for the plan author** |
| AUTH-S2 (new, part C) tooling task position | before S2.1 | before S2.1 (SA2's latest schedule; its earlier position was "after") | agreed: (a) |

---

## Part A: questions from SA2 (gpt-6-astra)

### SA2-Q-S01: what is the veryEasy tier?

Context: report section 4 "S0.1". `allowed(veryEasy)` holds the three singles; with an empty floor,
`tier = allowed − floor` gives those singles, not the empty tier of plan section 2, and `certifyFloor` would
report an undefined floor level.

- (a) The tier is the singles, with an explicit vacuous certificate (`required: true, vacuous: true`).
- (b) An empty displayed tier, with a documented exception to the set difference / union rule.
- (c) Define veryEasy's floor as its own allowed set.

SA2 recommends (a): it keeps the algebra and the `floor ∪ tier = allowed` invariant; (b) gives "tier" two
meanings; (c) changes the empty-floor definition.

**Answer (claude-fable-5-2, 2026-11-12):** (a). The tier of veryEasy is the three singles and its certificate is explicitly vacuous (`required: true, vacuous: true, floorLevel: null`). Plan section 2 ("veryEasy: ∅") was loose wording; the algebra `floor ∪ tier = allowed` holds without an exception. Joint report R1 is confirmed.

### SA2-Q-S02: how is the floor solve bounded, and what does an unknown result mean?

Context: report sections 4 "S0.1" and "S1.1". `certifyFloor` runs one restricted solve; a contradiction or an
exhausted budget is not a proof that the lower tier gets stuck (`core/js/engine/logical-solver.js:22-23,
334-343`).

- (a) A deterministic local work cap; an unverified result is never exact.
- (b) Only the inherited cancellation / deadline budget.
- (c) Retry once with a larger deterministic cap before rejecting.

SA2 recommends (a), with the cap calibrated from bounded samples: predictable worst-case work, possibly a lower
hit rate; (b) can be slow without a caller budget and depends on timing; (c) costs more and needs a fixed
two-stage policy.

**Answer (claude-fable-5-2, 2026-11-12):** Withdrawn with SA1-Q-S7 (a): generation runs no second solve, so there is no production floor cap and no "unverified" state. For the reference `certifyFloor` (tests, soak, tools): option (b), the inherited budget only; cancellation and budget failures propagate and are never read as "stuck"; a contradiction is an error. Joint report R2 "common contracts" is confirmed.

### SA2-Q-S03: does the band target reach beyond the guided dig (S1.2)?

Context: report section 4 "S1.2". `refineDown` and the local search keep their own objectives, which pull back
toward the band's top edge.

- (a) Uniform raw-band target and a tier-preserving comparator in the guided dig only; refine and local search
  unchanged.
- (b) Carry the same target into `refineDown` and the local search, preserving `required`.
- (c) Target only an empirically attainable sub-range of the band.

SA2 recommends (b), reporting unattainable target regions rather than changing weights: (a) leaves a strong
top-edge bias in the fallbacks; (b) is one coherent objective per sample but changes more output; (c) changes
the target distribution and needs data-defined bounds. Note SA2's measurement: in the plan's own sample Hard
does not hug the top (median band position 0.56, 3 of 24 in the top quarter); Expert does (9 of 12).

**Answer (claude-fable-5-2, 2026-11-12):** Owner decision (asked on the command line, 2026-11-12): **(b), joint report R7 branch B.** One target per sample, carried through the guided dig, `refineDown` and the local search, inside the existing caps and without a post-exact polishing search. Author's reasons: it is the only branch consistent with the fixed decision "scores spread across the band"; branch C's trigger (Expert median above 0.75 of the raw band) cannot work, because a certified Expert puzzle scores at least 812.5 from its XY-Wing alone (about 860 with the empty-cell term), so 0.75 is close to the middle of what Expert can reach. Consequences: (1) branch D is not adopted, the target stays uniform on the raw band and a target below the attainable range simply selects the lowest attainable puzzle; (2) every report of band positions (R23, MS18) gives the position in the raw band **and** in the attainable range `[max(min, 1.25 · w_min(tier) + V), max)`, and "hugs the top" is judged on the latter; (3) exact hit rate and time are compared before and after on the 17-cell manifest of R23; a loss of exact hits in a cell is reported to the owner, not fixed by dropping the target silently.

### SA2-Q-S04: chain windows and Nishio depth defaults for the new ids (S2.2)?

Context: report section 4 "S2.2".

- (a) `forcingChain` ≤ 6 links, `forcingChainLong` 7-12; `nishio` depth 1, `nishioDeep` depth 2-3 with default
  maximum 3.
- (b) Same ids, but `nishioDeep` defaults to depth 2; depth 3 only when explicitly requested.
- (c) Give depth 3 its own id and weight.

SA2 recommends (b) at first, for bounded cost, and to measure before enabling depth 3: (a) implements the
draft's window but may multiply generation time; (b) keeps today's default maximum but must be documented;
(c) goes beyond the plan. Please also confirm how public overrides (options passed by callers) behave.

**Answer (claude-fable-5-2, 2026-11-12):** (b) for Nishio: `nishio` is depth 1, `nishioDeep` has minimum depth 2, default maximum 2, and depth 3 only when a caller asks for it explicitly. Public overrides: a caller's valid maximum is intersected with the id's window and never enlarges it; an id called alone never relabels a proof that belongs to the other id (joint report R9 wrapper contract, confirmed). The chain cutoff is answered under SA1-Q-S1.

### SA2-Q-S05: how far do the expensive new pattern searches go (S3)?

Context: report section 4 "S3".

- (a) Documented limits (for example ALS size ≤ 4, small leftover differences for the law of leftovers), with
  deterministic work guards.
- (b) Exhaustive enumeration at every call.
- (c) Limits that depend on the board size.

SA2 recommends (a), with common constants chosen from evidence: feasible, but not logically complete for every
named pattern; (b) risks unusable dig and hint latency; (c) makes technique capability board-dependent, which
then belongs in the model and version docs. "Full scope" is read as implementing every named technique, not
unbounded searches.

**Answer (claude-fable-5-2, 2026-11-12):** (a). Documented, common, deterministic limits, the same on every board. The candidate values of joint report R10 (ALS of at most 4 cells, 4,096 retained ALS records, 50,000 work units per new finder, at most 2 leftover units and 4 difference cells per side, 4,096 extra grouped nodes) are approved as starting values. The task that introduces a finder measures cap hits and latency, may change its own limit once with the evidence recorded in its task record, and after MS17 a limit is part of rating version 3 (changing it needs a new version). "Full scope" means every named technique, not unbounded searches: confirmed.

### SA2-Q-S06: keep both "approximate" and "shallow" warnings (S1.1)?

Context: plan S1.1 step 5 ("Decide: keep both or make `shallow` replace `approximate`").

- (a) Keep `difficulty.approximate` and add `difficulty.shallow`.
- (b) Replace `approximate` with `shallow` in that case.
- (c) One structured warning with a new API.

SA2 recommends (a) (as the plan does): existing qualification and retry consumers keep working; (b) needs every
`approximate` consumer updated; (c) is a larger serialisation and UI change.

**Answer (claude-fable-5-2, 2026-11-12):** (a). Keep `difficulty.approximate` for every non-exact result and add `difficulty.shallow` for a complete in-band result proved shallow, plus the `tune.shallow` event (joint report R4). This settles the "Decide" of plan S1.1 step 5.

### SA2-Q-S07: where are the floor certificate and the rating version kept (S2.3)?

Context: report section 4 "S2.3"; plan S2.3 "Decide whether to show a small 'rated with v2' marker".

- (a) Keep the floor only in the v3 cache and the worker messages; add a truthful "current / unknown version"
  note to history entries.
- (b) Also export and import the certificate metadata.
- (c) No marker and no new external field.

SA2 recommends (a): the Player exchange format stays stable and the note explains why a regenerated old entry
changes level; (b) adds another claim to validate; (c) is smallest but hides the reason.

**Answer (claude-fable-5-2, 2026-11-12):** (a). No floor certificate in exports or in the Player exchange format; exactness travels only in the worker result and the v3 cache. New history entries store `ratingVersion`; entries without it are shown as "made by an earlier version; selecting it generates a new puzzle" (joint report R22, including keeping the history store `VERSION = 1`).

### SA2-Q-S08: base costs of the new ids and the group of the ALS techniques (S3)?

Context: report section 4 "S3". `SG.techniques.register` needs a `baseCost` and a `group` per id; the plan gives
weights and orders only.

- (a) `baseCost = weight / 10` for the new ids, existing costs untouched; ALS techniques in group `chain`.
- (b) Hand-picked base costs.
- (c) A new `als` group (registry, group order, help and certificates change).

SA2 recommends (a): predictable and keeps the calibrated weights separate. Base costs are not the v3 weights.

**Answer (claude-fable-5-2, 2026-11-12):** Group: ALS techniques go in the existing group `chain` (no new `als` group). Base costs: **table B of joint report R10** (lawOfLeftovers 20, skyscraper 33, twoStringKite 34, emptyRectangle 38, finnedXWing 40, remotePairs 44, finnedSwordfish 48, wxyzWing 57, bugPlusOne 72, xyChain 82, alsXz 106, sueDeCoq 112, forcingChainLong 118, nishioDeep 210). Reason: `baseCost` feeds only the solver's own design score, and table B keeps each new id between its neighbours in the existing raw scale (wxyzWing 57 between xyzWing 54 and wWing 60; forcingChainLong 118 between forcingChain 90 and nishio 140), which weight / 10 does not. Existing costs stay; no global raw-cost monotonicity assertion (jellyfish 56 / xyWing 48 already break it). The v3 score uses `WEIGHTS` only.

### SA2-Q-S09: what does S3 group 5 "Killer cage / unit interaction" mean?

Context: report section 4 "S3 group 5". `cageCombo` already does both ordinary cases the plan describes (a digit
every remaining combination needs, locked in one unit; the killer pair).

- (a) Keep `cageCombo` and add an explicit quick regression test for both cases (no new id).
- (b) Add a stronger assignment-derived pair pruning inside larger cages.
- (c) Split the existing effects into a new `cageLocked` id.

SA2 recommends (a): no duplicate id; (b) needs a precise matching algorithm and fixtures; (c) changes
attribution and weights of behaviour that already exists.

**Answer (claude-fable-5-2, 2026-11-12):** (a). I had not verified `cageCombo` when I wrote the plan (it said "check first"). Since it already does both cases, no new id: add the quick regression test for the two cases. `cageLocked` is dropped from the catalogue (40 ids in total, as the joint report counts).

### SA2-Q-S10: what happens to the reference puzzles' labels when cheaper new techniques solve them?

Context: report sections 4 "S0.1" and "S3"; `generator/tests/fixtures/rated.js` (entries use `label`, and
their certificates name technique families, not v3 tiers). The plan says "the reference puzzles must stay in
their levels, otherwise adjust the new weight, not the band".

- (a) Keep the v2 labels and certificates as historical and add v3 expectations next to them.
- (b) Constrain the new ids' weights within approved ranges so that selected labels stay.
- (c) Hold the release for a separate calibration decision.

SA2 recommends (a): it accepts the plan's intended downward reclassification (a puzzle rated Master today
because only a forcing chain found it may correctly become Hard); (b) can conflict with naming the easier proof;
(c) delays delivery. Weights and bands do not change without that separate decision.

**Answer (claude-fable-5-2, 2026-11-12):** **(a), joint report R20 branch A.** I withdraw the plan's sentence "the reference puzzles must stay in their levels, otherwise adjust the new weight" (plan S3, last paragraph): it conflicts with the fixed decision that weights stay unless a later calibration changes them, and it would fit weights to twelve hand-made puzzles. Keep the listed priors; keep the v2 labels and family certificates as history; add v3 expectations (level and `required`) next to them; record every reclassification with the technique that caused it in `docs/difficulty-v3/notes.md`. A puzzle that drops a level because a cheaper named technique now solves it is the intended effect of S3.

### SA2-Q-S11: how are the help examples for the new techniques obtained?

Context: report section 4 "S3"; `player/js/ui/help-examples.js` is generated (each example is a real puzzle
whose hint replay shows the technique).

- (a) Deterministic, curated source puzzles plus a bounded regeneration and check per new id.
- (b) Run today's large random search until every id appears.
- (c) Allow a separate synthetic candidate-state example format.

SA2 recommends (a): it keeps real hint-replay examples but needs fixture discovery work; (b) is unbounded in
practice and may never find rare ids; (c) changes a user-visible help contract and needs a new verifier.

**Answer (claude-fable-5-2, 2026-11-12):** (a). Curated real puzzles with bounded, deterministic tooling per new id (joint report R21). If an id cannot get a real hint-replay example within the bound, the task stops and reports; the assertion is not removed and no synthetic example format is introduced.

---

## Part B: questions from SA1 (claude-opus-5.5)

Source: `docs/difficulty-v3/claude-opus-5.5/1-report.md` section 5.2 (evidence in sections 2 and 4).

How the two sets relate (positions after the cross-review are in the status table at the top):

| SA1 | SA2 | Relation |
|---|---|---|
| SA1-Q-S1 chain window | SA2-Q-S04 | **conflict**: SA1 recommends `forcingChain` ≤ 4 / `forcingChainLong` 5-12; SA2 keeps ≤ 6 / 7-12 and asks about the Nishio depth |
| SA1-Q-S2 Easy must need a tier technique | SA2-Q-S01 (veryEasy) | related, different levels |
| SA1-Q-S3 how a shallow result is shown | SA2-Q-S06 | same question, same recommendation (both warnings); SA1 adds a `tune.shallow` event |
| SA1-Q-S4 `refineDown` toward the target | SA2-Q-S03 | **conflict**: SA1 recommends skipping it for now; SA2 recommends carrying the target into refine and local search |
| SA1-Q-S5 levels that may stop being offered | none | new: only SA1 raises it |
| SA1-Q-S6 "rating v2" marker in history | SA2-Q-S07 | related, both recommend a marker |

### SA1-Q-S1: chain-length window between `forcingChain` (Master) and `forcingChainLong` (Nightmare)?

Context: report sections 0 (issue 2) and 2.2. All 12 sampled Nightmare puzzles of today peak at `forcingChain`
with chains of 3-6 links, so with the planned window (≤ 6 / 7-12) none of them needs a Nightmare technique:
Nightmare would need a 7+ link chain or Nishio, Hell 1 a depth-2 Nishio. See also SA2-Q-S04.

- (a) As planned: ≤ 6 / 7-12. None of the 12 sampled Nightmare puzzles qualifies; Nightmare is likely to fail
  qualification on most variants.
- (b) ≤ 4 / 5-12. 6 of the 12 sampled Nightmare puzzles (chains of 5-6 links) qualify; Master keeps its 3-4 link
  chains; a 5-6 link chain step scores 1,400 instead of 1,100.
- (c) Decide from the S0.2 histogram before S2.2.

SA1 recommends (b), confirmed by (c).

**Answer (claude-fable-5-2, 2026-11-12):** Owner decision (asked on the command line, 2026-11-12): **(c) measured choice, joint report R9 branch C, with the proposed rule approved.** On the MS07 code compare the cutoffs C = 4 and C = 6 on fresh Nightmare requests of classic9, diagonalX and jigsaw9 (the twelve-request soak manifest, identical budgets, every request counts, a timeout or error is a miss); take the cutoff with more exact hits in total, C = 6 on a tie; report each variant, the time and the shallow outcomes. Repeat after S3 (MS18); if the rule then selects the other value, stop before the final qualification and ask the owner. Fixed-board re-scoring (0 of 12 and 2 of 12) is evidence, not the selection denominator. Both window bounds are enforced inside each id.

### SA1-Q-S2: must Easy puzzles need pointing, box/line reduction or a naked pair?

Context: report section 0 (issue 3). Today an Easy puzzle can be singles-only: the empty-cell term V (about 42 at
44 empty cells) plus a few points of singles reaches 45; all three constructed Easy fixtures (score 46, singles
only) are shallow.

- (a) Yes, as decided for every level: a singles-only puzzle scoring 45 or more is no longer an exact Easy result
  (it is shallow, returned only as an approximate fallback); Easy gets a technique identity.
- (b) Treat Easy's tier as vacuous: Easy stays "singles with more empty cells"; contradicts the decided rule.

SA1 recommends (a).

**Answer (claude-fable-5-2, 2026-11-12):** (a). A fixed decision applied to Easy: a singles-only puzzle that scores 45 or more is shallow, not an exact Easy result. The three constructed Easy fixtures (score 46, singles only) get the v3 expectation "shallow" under SA2-Q-S10 (a).

### SA1-Q-S3: how is a shallow result shown (S1.1 step 5)?

Context: report section 4 "S1.1". Same question as SA2-Q-S06.

- (a) Both warnings, `difficulty.approximate` and `difficulty.shallow`, plus a new step event `tune.shallow`.
- (b) `difficulty.shallow` replaces `difficulty.approximate` when the score is in band; consumers keyed on
  `approximate` (`generator/js/ui/app.js:817`, the result view's yellow alert and Retry button) miss shallow
  results unless updated.
- (c) No new warning (approximate only).

SA1 recommends (a).

**Answer (claude-fable-5-2, 2026-11-12):** (a). Same answer as SA2-Q-S06: both warnings and the `tune.shallow` event.

### SA1-Q-S4: `refineDown` toward the target (S1.2 step 3, optional in the plan)?

Context: report section 4 "S1.2". See also SA2-Q-S03 (opposite recommendation).

- (a) Implement it with S1.2: up to `REFINE_RATINGS` (64) more ratings per proposal above the band.
- (b) Skip it; re-measure band positions after S1.2 and add it only if Hard and Expert still hug the top.

SA1 recommends (b).

**Answer (claude-fable-5-2, 2026-11-12):** Owner decision (asked on the command line, 2026-11-12): **implement it (a), as part of joint report R7 branch B** (see SA2-Q-S03). `refineDown` continues toward the target only through solved, in-band, required reveals with a strictly smaller target distance, inside the existing 64-rating cap.

### SA1-Q-S5: levels that may stop being offered?

Context: report sections 0 and 2.2. With "required", Killer Hard and Expert (6 of 6 shallow today), Nightmare
(12 of 12) and Hell 1 (needs a depth-2 Nishio) may fail `qualify.js`.

- (a) Accept what qualification decides and update `docs/difficulty-rating/qualification.md` (or its v3
  successor) and `difficultySupport` (plan section 8).
- (b) Also run the section 6 weight calibration (for example `ruleOf45`, `cageSplit`) in this plan; weights
  change, which plan section 1.3 defers to a later calibration.

SA1 recommends (a), with the outcome recorded in `docs/difficulty-v3/notes.md`.

**Answer (claude-fable-5-2, 2026-11-12):** (a). Accept what the final qualification (after S3) decides; no weight calibration inside this plan and no pruning from intermediate runs. A level that stops being offered is reported to the owner in `docs/difficulty-v3/notes.md` with its hit counts, so the section 6 calibration can be decided on data.

### SA1-Q-S6: a marker for history entries rated with v2 (S2.3, optional)?

Context: report section 4 "S2.3". See also SA2-Q-S07.

- (a) A small "rating v2" marker in the result view for entries with `ratingVersion < 3` (two strings per
  language).
- (b) No marker.

SA1 recommends (a).

**Answer (claude-fable-5-2, 2026-11-12):** (a), in the form both analysts agreed: new entries carry `ratingVersion`; an entry without it shows the "made by an earlier version" note (it is not provably v2). Two strings per language.

---

## Part C: new questions from the cross-review

### SA1-Q-S7: derive `required` from the rating instead of a separate floor solve?

Context: `docs/difficulty-v3/claude-opus-5.5/2-review-of-gpt-6-astra.md` section 2.2.1. Proposed definition, for a
rating computed by `rate()`:

```text
required(rating, level) = rating.solved
  && some id with rating.techniqueCounts[id] > 0 is not in floorTechniques(level)
```

Argument: the logical solver is a greedy ladder, so the solve restricted to the floor follows the full solve step
by step until the first step at which the full solve applies a non-floor technique; at that point every floor
technique has just returned nothing, so the restricted solve is stuck there. The equality is exact once orders are
monotone in the weights (S2.1); before that, a mismatch is possible only where an order inversion straddles a tier
edge (`jellyfish` after `xyWing`). SA1's probe at HEAD: derived value equal to the floor solve in 96 of 96 cases
(classic9 Normal to Nightmare, Killer, Jigsaw9, Greater-Than). It removes the second solve per candidate, the floor
cap and the "unverified" state (SA2-Q-S02), and the keeper bug by construction; `certifyFloor` stays as the reference
(tests, soak, tools, ratings made with other solver options), with a quick test asserting the equivalence.

- (a) Derived `required` in the digger; `certifyFloor` as the tested reference (SA1).
- (b) A separate floor solve as in the plan, with the cap and unknown-result policy of SA2-Q-S02.

SA1 recommends (a). SA2 accepts it in its response for complete canonical `rate()` results after S2.1, with
identical finder options and the uniqueness proof kept; other ratings use `certifyFloor` (verified independently,
39 of 39).

**Answer (claude-fable-5-2, 2026-11-12):** **(a), confirmed.** The prefix argument is right: with orders monotone in the weights (S2.1) the floor of a level is a prefix of the ladder, so the floor solve is stuck exactly when the canonical rating uses a non-floor technique. Conditions as in joint report R2: only complete canonical `rate()` / `rateCounted` results on the same model and givens, uniqueness proved as today; anything else uses `certifyFloor`. Keep the equivalence test (after S2.1 only) and a bounded independent-reference sample in soak. This replaces `ensureFloor` and the `rating.floor === undefined` fallback of plan S1.1.

### SA2-Q-S12: an additional shallow-search budget?

Context: `docs/difficulty-v3/gpt-6-astra/2-review-of-claude-opus-5.5.md` section 4.3. With `!isExact` as the loop
condition, the local search can run on through the attempt caps at levels where "required" is rare. SA1 proposes
`SHALLOW_SEARCH_RATINGS = 128` (`docs/difficulty-v3/claude-opus-5.5/1-report.md` section 5.1, R4).

- (a) The existing attempt caps only (1,024 ratings / 32,768 proposals).
- (b) An additional 128 full ratings after the first in-band shallow state (SA1).
- (c) A cap chosen from measured hit rate against cost, the same for every level and variant.

SA2 recommends (c), with (a) as the baseline until a cap is chosen. SA1 withdrew its 128 and agrees.

**Answer (claude-fable-5-2, 2026-11-12):** (c), with the selection protocol of joint report R5 approved as written: compare 64, 128, 256 and no extra cap on the six listed cells; take the smallest finite cap with no exact-hit loss in any cell and a strict reduction of the median full ratings in at least one cell, otherwise no extra cap. Until the measurement, the existing attempt caps only.

### AUTH-S1: where is the v3 qualification recorded? (for the plan author)

Context: SA1's response, position table row 26; SA2's response section 5.3. The plan (S1.1 gate, plan line 305)
updates `docs/difficulty-rating/qualification.md`, which `generator/tests/qualify.js --markdown` writes
(`generator/tests/qualify.js:71`) and `generator/tests/manual/difficulty.test.js` asserts; plan rule 8 also says
the reports under `docs/difficulty-rating/` are dated records not to be edited.

- (a) Update `docs/difficulty-rating/qualification.md` as the plan says (it is the live offered table), with the v3
  evidence notes under `docs/difficulty-v3/` (SA1).
- (b) Write a new `docs/difficulty-v3/qualification.md`, keep the old file as the v2 record, and move the readers
  (`qualify.js`, the manual `difficulty` suite, links) to the new file (SA2).

**Answer (claude-fable-5-2, 2026-11-12):** **(a).** `docs/difficulty-rating/qualification.md` is the live offered table that `qualify.js --markdown` writes and the manual `difficulty` suite asserts; it is not one of the dated reports, and plan rule 8 should have said so (my omission). MS18 updates it in place and first copies the v2 table to `docs/difficulty-v3/qualification-v2.md` as the record. Checkpoint runs write only under `docs/difficulty-v3/` and never touch the live table. No reader paths change.

### AUTH-S2: position of the tooling task (for the plan author)

Context: SA1's response, position table row 20. The tooling task builds the golden-analysis recorder / checker for
`generator/tests/fixtures/replay-goldens.js` (today hand-recorded) and adapts the help-example tool.

- (a) Before the order change (S2.1), because S2.1 is the first output change and already needs the recorder (SA1).
- (b) After the order change, before the first new technique id (SA2's response).

Both analysts' latest schedules (the joint report draft, `docs/difficulty-v3/report-detailed.md`) now put the
tooling task before the order change: agreed (a).

**Answer (claude-fable-5-2, 2026-11-12):** (a), confirmed: the tooling task (MS04) comes before the order change (MS03 / S2.1).

### PROC-S1: step order and qualification timing

Context: SA1's review section 2.2.2; SA2's breakdown (`docs/difficulty-v3/gpt-6-astra/1-report.md` section 6).

- (a) S0.1, S0.2, S2.1, S1.1, S1.2, S2.2, S3, S2.3; first `qualify.js`, `perf.js --update-hashes` and manual
  `difficulty` run after S2.2, and again at the end (SA1). Reason: with S1 first, the S1.2 steering signal and the
  derived certificate are not exact until S2.1, goldens, hashes and help examples are recorded twice, and a
  qualification before S2.2 would wrongly drop Nightmare and Hell 1.
- (b) The plan's order (S1 before S2.1), with qualification after S1.2 (SA2's first report).

Both analysts now agree on (a).

**Answer (claude-fable-5-2, 2026-11-12):** (a), confirmed: baseline and tooling, S2.1, S1.1, S1.2, S2.2, S3, S2.3; first qualification after S2.2 as a checkpoint, the final one after S3. My original order (S1 before S2.1) was wrong for the reason SA1 gives: the tier steering and the derived certificate are exact only once the orders are monotone.

---

## Part D: corrections to the plan found by the analysts (for confirmation)

These are not choices; they are places where the analysts found the plan wrong or incomplete. Mark any you
disagree with.

From SA2 (report sections 0 and 5.1):

1. The constructed-fixture floor test of S0.1 is false as written: entries of
   `generator/tests/fixtures/rated.js:103-179` use `label`, not `level`, and normal-1, normal-3 and all three
   Nightmare constructed puzzles are solved by today's allowed set of the level below.
2. `createKeeper.offer` computes and pre-filters the distance before the proposed certification, and
   `keeper.closer` is called even earlier by the local search and by Killer: certify (or use a safe optimistic
   pre-check) before ranking, then recompute the distance (`generator/js/engine/digger.js:1041-1070, 1463`,
   `generator/js/variants/killer.js:907`).
3. A missing certificate must not count as exact: drop the `rating.floor === undefined` fallback of `isExact`.
4. S1.2 terminates, but its stop rule can give up a tier-using state, and applying a finite-band target to the
   `STUCK_SCORE` proposal values reverses the top-level proposal heuristic: keep proposal priority separate from
   score distance.
5. With fixed weights several bands cannot be covered uniformly: a certified Expert using XY-Wing scores at
   least 812.5 from techniques alone; `nishioDeep` starts at 3250 inside Hell 1's [2400, 3600).
6. S2.1's new orders agree with the final S3 table (including `forcingChainLong = 198`), but other tests pin
   the old orders and the frozen classic fixture ladder: moving three registrations and adding one assertion
   will not leave the quick suites green.
7. Grouped links cannot be added to the forcing-chain graph (`cell * digits + digit` nodes) without extending
   the node representation, scratch bounds and proof serialisation.
8. Integration facts: the Killer and Greater-Than suites are manual, not quick; the help examples live in
   `player/js/ui/help-examples.js`; `generator/tests/replay-fixtures.js` updates four wire fixtures, not the 14
   golden analyses; `generator/design.md` section 14.1 is the JSON format, not known limitations; a new core
   file (`tech-als.js`) goes into all eight script lists and both core suite lists.
9. `core/js/engine/tech-subset.js:48, 136` keeps a `nodes` counter across calls; extra floor solves would shift
   later guard boundaries by call history. Reset or localise it before adding caps based on `ctx.check()`.

From SA1 (report sections 0 and 5.1):

10. S2.1 breaks a core test the plan does not name: `core/tests/suites/techniques.test.js:41-43` asserts that the
    classic registry order equals the frozen `LADDER` of `core/tests/fixtures/techniques.js:32-36`. Keep the
    fixture's position ladder frozen and make the expected registry order a separate list.
11. Every new technique id (2 in S2.2, up to 12 in S3) needs real fixture positions (2 positive with the exact
    Finding and 1 negative per classic id, `core/tests/suites/techniques.test.js:71-87`) and a Player help example
    (`player/tests/suites/help.test.js:126-129`), generated into `player/js/ui/help-examples.js` by
    `player/tests/tools/make-technique-examples.js`, which supports classic9, diagonalX, hyper, killer and
    greaterThan only (no jigsaw, needed for `lawOfLeftovers`). `bugPlusOne` breaks
    `core/tests/suites/techniques.test.js:64-69` (only `uniqueRectangle` may assume uniqueness).
12. The quick replay suite pins generator output: `generator/tests/suites/replay.test.js:611-635` checks 14 golden
    requests against hand-recorded rows in `generator/tests/fixtures/replay-goldens.js`; every output-changing step
    (S1.1, S1.2, S2.1, S2.2, each S3 group) breaks the quick set until the goldens are re-derived;
    `generator/tests/suites/steps.test.js:879-889` pins one too.
13. The local search with `!isExact` can burn the attempt caps (1,024 ratings, 32,768 proposals) at levels where
    "required" is rare: bound it (SA1 proposes `SHALLOW_SEARCH_RATINGS = 128`).
14. Order of work: S2.1 before S1.1 (the tier steering assumes monotone orders), the S0.2 baseline before both;
    run `qualify.js`, `perf.js --update-hashes` and the manual `difficulty` suite once after S2.2 and once at the
    end (a qualification after S1 alone would drop Nightmare and Hell 1 wrongly).
15. The comment "otherwise master's floor would lose Unique Rectangle" in S0.1 applies to Nightmare's floor.
16. SA1's measurements differ from the plan's picture of where "required" bites: classic9 Hard 0 of 24 shallow,
    Expert 0 of 12, but Normal 5 of 12, Master 4 of 12, Nightmare 12 of 12, Killer Hard and Expert 6 of 6, jigsaw9
    Expert 4 of 6, Greater-Than Hard 2 of 6. For classic9 Hard, what changes the puzzles is S1.2 and S3, not S1.1.

---

## Part D: author's response (claude-fable-5-2, 2026-11-12)

All sixteen corrections are accepted; none is disputed. Notes:

- Items 1, 3 and 15 are my errors (the fixture field is `label`; the `floor === undefined` fallback must go; the
  Unique Rectangle remark belongs to Nightmare's floor).
- Item 4: accepted as the joint report's R6 table (tier-first; proposal priorities are never compared with a score).
- Items 5 and 16: accepted, and they correct the plan's section 1.1. "Scores hug the top of the band" is measured
  for Expert only, and part of that is structural (see SA2-Q-S03). For classic9 Hard the level-below set already
  gets stuck in 24 of 24 puzzles; what changes Hard is the target (S1.2) and the wider tier (S3). The requirement
  bites at Normal, Master, Nightmare and on Killer, Jigsaw and Greater-Than.
- Item 7: accepted; grouped links need the extended node representation of joint report R16.
- Item 13: superseded by SA2-Q-S12 (c).

## Part E: decisions in one place

| Topic | Decision | By |
|---|---|---|
| Target scope (SA1-Q-S4 / SA2-Q-S03) | one target per sample through guided dig, refinement and local search (R7 branch B); positions also reported against the attainable range | owner |
| Chain cutoff (SA1-Q-S1 / SA2-Q-S04) | measured choice between 4 and 6 by exact-hit count, 6 on a tie, re-checked after S3 (R9 branch C) | owner |
| Nishio depth | `nishioDeep` default maximum 2, depth 3 only on request | author |
| Requiredness (SA1-Q-S7, SA2-Q-S02) | derived from the canonical rating; `certifyFloor` is the reference with the inherited budget | author |
| Shallow-search budget (SA2-Q-S12) | measured cap by the R5 protocol; existing caps until then | author |
| Base costs, ALS group (SA2-Q-S08) | table B of R10; group `chain` | author |
| Pattern limits (SA2-Q-S05) | R10 candidate values as starting values, frozen with version 3 | author |
| Reference labels (SA2-Q-S10) | keep the priors and the v2 labels, add v3 expectations, record reclassifications (R20 branch A) | author |
| Qualification record (AUTH-S1) | update the live table in place, v2 copy under `docs/difficulty-v3/` | author |
| Order of work (PROC-S1, AUTH-S2) | baseline and tooling, S2.1, S1, S2.2, S3, S2.3 | author |
| Everything marked "agreed" in the status table | confirmed as agreed | author |

No PENDING item of `docs/difficulty-v3/report-detailed.md` remains open: R2 → A; R5 → C; R7 → B; R9 → C;
R10 costs → B, limits → the candidate values; R20 → A; R24 → A.

---

## Part F: remaining concerns after the answers were applied (for acceptance)

Raised by the lead analyst while applying the answers to `docs/difficulty-v3/report-detailed.md` (section 9). It is a
qualification of wording and reporting, not a change to any decision.

### AC01: the "attainable range" is a diagnostic lower bound, not a reachability guarantee

Context: `docs/difficulty-v3/report-detailed.md` section 9 (AC01), R7 and R23; answer to SA2-Q-S03.

1. `1.25 · w_min(tier) + V` bounds the **unrounded** score of a puzzle that needs a non-vacuous tier; it is not a
   proved minimum this generator can reach. `breakdown` returns an unrounded sum and `Math.round` of it
   (`generator/js/engine/difficulty.js:239-268`), the tier can be empty, and veryEasy is vacuous (SA2-Q-S01), so a
   finite adjusted position does not exist for every puzzle, and rounded or shallow scores can fall outside it.
2. "A target below the attainable range simply selects the lowest attainable puzzle" cannot mean a guaranteed
   global minimum while the approved first-exact stop, the 64-rating refinement cap and the other attempt caps stay
   (`generator/js/engine/digger.js:630-641, 1100-1147, 1667-1739`); a bounded search can only prefer a nearer score
   among the candidates it reaches.

Proposed acceptance: keep the approved interval where it is defined and call it an analytic lower bound of the
attainable range; report `null` with a reason where the adjusted position is undefined, and leave defined values
unclamped; describe a below-bound target as steering toward the lowest scores reached, not a guaranteed minimum. No
change to target sampling, the first-exact stop, weights or budgets.

**Answer (claude-fable-5-2, 2026-11-12):** Accepted as proposed. `1.25 · w_min(tier) + V` is an analytic lower bound of the attainable range, not a reachability guarantee; my phrase "simply selects the lowest attainable puzzle" was too strong and means "steers toward the lowest scores the bounded search reaches". Report `null` with a reason where the adjusted position is undefined (vacuous or empty tier, unrated or off-band result, non-finite band, non-positive width), leave defined values unclamped, and keep the raw position next to it. No change to target sampling, the first-exact stop, weights or budgets. R7 and R23 as written are confirmed.

## Part G: acceptance by the plan author (claude-fable-5-2, 2026-11-12)

I reviewed `docs/difficulty-v3/report-detailed.md` (R1-R24, errata, MS01-MS18, gates) and `report-brief.md` at
`61da39a` against my answers of parts A-E. Every answer is applied as given (R2 derived certificate, R5 measured cap,
R7 one target through all three stages, R9 measured cutoff, R10 cost table B and starting limits, R20 priors kept,
R24 live table updated in place). With AC01 answered above, **the plan author accepts the report as the basis of
the task pack.** No open question remains on the author's side; the owner's acceptance is separate.

## Part H: post-acceptance performance finding — CV6-01

Raised by SA2 (gpt-6-astra), 2026-11-12, after the MS04 implementation and its isolated measurements.
This is a new empirical finding, not a withdrawal of the acceptance in Part G. **Answer requested from the
plan author and the owner.** The contracted order and the failing assertion remain unchanged meanwhile.

### CV6-01: who owns restoring Greater-Than Normal generation performance?

**Evidence.** See [MS04 notes](notes.md#ms04-monotone-orders-and-the-derived-certificate) and
[MS04 evidence](evidence/MS04/evidence.md). Both quick sets pass. The three contracted order changes explain all
27 changed regression hashes, G09-G11 wire changes and G09-G12 analysis changes. The subset-counter reset does
not explain the performance regression.

| Observation | Old orders / diagnostic control | Contracted orders |
|---|---|---|
| Manual Greater-Than Normal CV6 | design budget 700 ms; this run's assertion limit 1,400 ms | p95 2,035 ms: fails |
| Seeds 300-319, two runs | p95 92 / 94 ms; total about 1.0 s | p95 2,088 / 2,216 ms; total 12.9 / 13.4 s |
| Seeds 7000-7039 | p95 125 ms; total 2.2 s | p95 5,043 ms; total 62.9 s |
| Only `ineqChain` restored to order 65, other two new orders retained | p95 97 ms on seeds 300-319 | isolates the cause to `ineqChain` 65 -> 46 |
| Seed 308 | 1 attempt, 27 steps | 4 attempts, 604 steps; three attempts reach 24 clues but still rate Easy, score 145 |

These are the recorded developer measurements; SA2 did not run another timing sample while Pentomino timing
runs were active.

**Code facts.**

- `generator/js/variants/greater-than.js:378-411` digs signs to a unique minimal set, rates the result, and ends
  tuning when it is not too hard. A below-band Easy result therefore leaves this stage; it is not repaired upward
  by another pass of that loop.
- The Normal base floor is 29 (`generator/js/engine/difficulty.js:117`); Greater-Than's `clueFloorScale.normal`
  is 0.83 (`generator/js/variants/greater-than.js:445-450`), giving the observed 24-clue floor.
- `generator/js/engine/digger.js:1381-1422` forbids clue additions on a model with inequalities and preserves the
  clue floor. The existing local moves remove a sign or a clue group; they do not supply a compensating clue
  relocation followed by re-minimisation of the signs.
- `generator/tests/manual/greater-than.test.js:18,1031-1035` has its own Normal `BUDGET_MS = 700` and compares
  against `SG.test.timeLimit(...)`. Updating the separate `PERF_TARGETS` table alone cannot make CV6 pass.

**Disposition: no existing later task restores this budget by design.**

| Task | What it owns | Why it does not own this repair |
|---|---|---|
| MS05a | Exactness transport, prepared messages | No generation/search change. It may proceed unchanged |
| MS05b | Requiredness, keeper prefilters, shallow continuation, model-safe ratings | Makes acceptance stricter; keeps existing caps and movement constraints. It does not repair the Greater-Than minimal-sign/24-clue trap |
| MS05c/MS05d | Select a common extra allowance after an in-band shallow result | Seed 308's failed attempts are below band, not in-band shallow. The fixed six-cell selection experiment does not include Greater-Than |
| MS06b/MS06c | One target through guided dig, refinement and local search | Keeps clue floors, sign guard and caps; refinement is not entered for models with inequalities. Ranking may alter outcomes but guarantees neither escape nor a 700 ms p95 |
| MS06d | Measure target-policy hit/time changes | Evidence only; explicitly forbids repairing a regression by changing source, scope or budgets |
| MS13c / MS15b GP | Measure the introducing grouped-chain / ALS work | Their named cells are classic9 nightmare, mega16 easy, and jigsaw9 nightmare, not Greater-Than Normal; no variant-generation optimisation is in scope |
| MS18d | Final performance evidence and qualification-authorised `PERF_TARGETS` updates | Explicitly excludes algorithm tuning. A permitted target update is a changed performance contract, not restored runtime, and its ownership does not include CV6's hard-coded budget |

Final qualification might change availability or permit a different GP target, but neither result establishes
that Greater-Than Normal meets the currently accepted CV6 contract. The failure must stay open until a named,
evidenced resolution is accepted; it must not be assigned vaguely to "MS05 onward" or the final GP run.

**Question. Which resolution is authorised?**

| Option | Resolution | Consequence |
|---|---|---|
| (a) | Keep the contracted order 46, requiredness/prefix invariant, weights, bands and current performance contract. Authorise a separate bounded Greater-Than strategy investigation and repair, with a precise task contract before implementation | Additional implementation/evidence work. Success is measured, not promised. A failure to recover the budget returns here; it does not authorise a hidden cap/floor/budget change |
| (b) | Keep order 46 and the rating semantics, but explicitly accept a slower Greater-Than Normal contract after qualification, or decide not to offer the cell if it fails the existing qualification policy | No runtime recovery is claimed. Any new target must be documented and consistently applied to GP and the manual CV6 contract before the final timing runs; availability loss is visible. The 700 ms assertion cannot be relaxed as an unexplained MS04 fix |
| (c) | Revisit the technique ordering / requiredness design for this variant, using order 65 as a diagnostic starting point | The 97 ms control is promising for speed, but simply reverting the order breaks the accepted non-decreasing-weight invariant behind the derived certificate. A new sound prefix/certificate design, attribution, hashes and reference evidence are required; this is not a one-line performance fix |

**Recommendation: (a).** Do not undo the semantic correction or increase a budget merely to hide this measured
regression. Reserve a new task, provisionally **MS05e**, after MS05d and before MS06a captures the pre-target
baseline. That ordering lets the repair see final requiredness and the selected common allowance, while keeping
the target comparison isolated. This is a proposed additional task, **not an authorised change to MS05a or a
claim that the existing MS05b contract already contains it**.

The plan author should specify the bounded escape/restart strategy and its work accounting before dispatch.
Candidates to investigate include avoiding repeated impossible removals at the clue floor, or a compensating
clue/sign move that re-establishes the minimal-sign property. Any such move must preserve uniqueness, symmetry,
the accepted clue floor and required exactness; changing those constraints or budgets needs a further explicit
answer. No strategy is asserted to meet the budget without measurement.

Required closure evidence for (a): the unchanged CV6 assertion; matched repeats of seeds 300-319 and 7000-7039;
raw p50/p95/max against the 700 ms design target as well as the actual test limit; attempts, work and exact-hit
counts under current requiredness; no invalid or ambiguous output; explained deterministic output changes.
Keep the old MS04 evidence. Run timing-sensitive work only in the orchestrator's exclusive cross-repository
timing slot and follow the current lock protocol. MS18d/MS18e then verify the accepted resolution rather than
discovering or inventing it.

**Answer (plan author, claude-fable-5-2, 2026-11-12): (a), with the strategy and its bounds specified below, and
(b) named in advance as the only fallback. (c) is rejected.** The owner's confirmation is needed for the extra task
and for the fallback rule; nothing below changes order 46, the prefix invariant, weights, bands, floors or caps.

**Why the regression is real and (c) is wrong.** The old speed was an artefact of the inversion this plan removes.
With `ineqChain` (weight 40) tried after `nakedPair` (120), the solver used a pair where a 40-point inequality step
was enough, so many Greater-Than puzzles rated Normal that are Easy by the cheapest proof (seed 308: three attempts
end at the 24-clue floor with score 145). Restoring order 65 would restore the wrong ratings, and it breaks the
non-decreasing-weight prefix behind the derived certificate (SA1-Q-S7). Honest Normal puzzles are simply rarer on
this variant, and the sign dig has no way to look for them: `digPass` (`generator/js/variants/greater-than.js:303-334`)
removes the first sign of a shuffled order that the oracle allows, the minimal pass then removes every redundant
sign, and a result below the band at the clue floor leaves the loop (`:394-411`) with nothing left to remove. The
cells dig got its guided stage for exactly this reason (`generator/js/engine/digger.js:704-715`: random minimal
puzzles need nothing beyond singles about three times out of four); the sign dig never got one.

**MS05e: guided sign dig (bounded).** Position as SA2 proposes: after MS05d, before MS06a.

1. *Diagnosis first, recorded.* For seeds 300-319: per attempt and sample, the final clue count, sign count, score,
   level, `required`, and whether the sample ended below the band at the clue floor with a minimal sign set. This
   confirms the trap is the dominant path before any code changes; if it is not, stop and report.
2. *The change, in the technique-oracle pass only* (`digPass(order, techniqueOracle, 'signs')`): instead of taking
   the first allowed sign, evaluate a pool of the next `SIGN_POOL = 8` live signs in the existing shuffled order
   (fewer when fewer remain). Each evaluation is the solve the oracle already runs (`solveWithin` with the level's
   set, after the uniqueness count); classify its report to `{ score, tierUsed }` and refuse it as today when it is
   ambiguous, stuck, or scores at or above `spec.max`. Apply the pool winner by the R6 comparator: `tierUsed` first,
   then the smaller distance to the sample's target when the context carries one (after MS06), otherwise the
   higher score. Ties keep the shuffled order. A refused sign stays refused for the rest of the pass, as in the
   cells dig. The `signs.minimal` pass, the clue reveals, `MAX_TUNE_ROUNDS`, the keeper offer and the final
   rating are unchanged.
3. *Work accounting.* Every pool evaluation counts in `stats.oracleCalls` and ticks the inherited budget; no new
   cap, no clock. The pass still ends: each step removes one sign or refuses the whole pool. The dig log keeps its
   operations (`accept` / `reject` per sign, in evaluation order), so the replay needs no new kind; an allowed pool
   member that is not the winner is logged as `keep`, as the cells dig does.
4. *Not allowed in this task:* changing the clue floor or `clueFloorScale`, `CAP_RATINGS`, `CAP_PROPOSALS`,
   `MAX_TUNE_ROUNDS`, any weight, order or band, the exactness rule, or the CV6 assertion; adding clues back on a
   model with inequalities; a second strategy (for example a compensating clue relocation) without a new answer.
   `SIGN_POOL` may be tried at 4, 8 and 16 once, with the numbers recorded; the chosen value is then fixed.
5. *Scope.* `generator/js/variants/greater-than.js`, its tests (`generator/tests/suites/` quick cases for the pool
   comparator and determinism; `generator/tests/manual/greater-than.test.js` unchanged in its assertions),
   `generator/design.md` (the Greater-Than dig), both developer guides if they describe the sign dig, and the
   task-owned hashes, goldens and help examples (GG, GR, GH) for Greater-Than only. Size M; if it grows beyond that,
   stop and report.
6. *Closure evidence:* as SA2 lists (the unchanged CV6 assertion; matched repeats of seeds 300-319 and 7000-7039;
   p50 / p95 / max against 700 ms and against the test limit; attempts, work and exact hits under current
   requiredness; no invalid or ambiguous output; explained output changes), plus the same table for Greater-Than
   Easy, Hard and Expert on seeds 300-319, to show the guided pass does not slow the neighbouring levels.

**Fallback, fixed now so that it is not improvised later.** If MS05e's closure evidence does not bring CV6 under
its assertion, the task stops and reports; the owner is then asked to choose (b) with the measured numbers: either
a documented slower Greater-Than Normal contract, applied consistently to CV6's `BUDGET_MS` and to GP before the
final timing runs, or not offering the cell if final qualification fails it. For scale: the v2 table already
offers Greater-Than Hard at p95 2.00 s and Expert at 9.50 s against the 10 s qualification budget
(`docs/difficulty-rating/qualification.md:183-184`), so a Normal p95 of 2-5 s would keep the cell offered but
would be slower than its 700 ms design budget. No budget, floor or assertion is relaxed without that answer.

**MS05a-MS05d proceed unchanged**; CV6 stays red and recorded as open until MS05e closes it or the owner answers
the fallback. MS06b passes the sample's target into the sign-dig context so the comparator of step 2 uses it; this
is the only edit MS06 makes to the sign dig, and R7's statement that refinement is not entered for models with
inequalities stays true.

**Owner (2026-11-12 18:20):** confirmed both points of the plan author's answer: (1) the new task MS05e, guided sign dig, as specified above (after MS05d, before MS06a); (2) the fallback rule (b) as fixed above. Decision S-OD1; the orchestrator asks SA2 to write MS05e, its check-list rows and the MS06b note.

### CV6-02: requiredness activation cannot cross its validation checkpoint

**Raised by SA2, 2026-11-13. Answer requested from the plan author and owner.**
This is distinct from Greater-Than CV6-01. It concerns the acceptance boundary of MS05b1 and
the now-observed large-board costs, not the already accepted exactness/prefix design.
Full analysis: [runtime finding RF01](gpt-6-astra/7-response-to-task-pack-review.md#8-runtime-finding-rf01--the-no-allowance-activation-cannot-pass-its-acceptance-gate).
Evidence: [MS05b1](evidence/MS05b1/evidence.md) and [notes](notes.md#ms05b1-required-exactness-in-the-engine).

**Current state.** HEAD is `f788e02`; MS05b1 is uncommitted and not accepted. Requiredness is
active, with no additional shallow allowance. Its full GG and four wire records complete,
but G13 prevents the 14-record analysis merge and the Generator quick acceptance is not green.

| Recorded observation | Consequence |
|---|---|
| 149/520 changed hashes: old shallow -> new different required puzzles; mean attempts 1.13 -> 2.38 | Keep the real semantic improvement; old level equality is not an acceptable speed fix |
| 56 unchanged puzzles now return as shallow fallbacks, including killer/hard 20/20, classic9/nightmare 14, diagonalX/nightmare 9 | These requests can spend all eight attempts without becoming exact |
| G13, samurai Nightmare seed 42: same puzzle/hash `93f9be5f208b`, score 1637; old 0.16 s/one attempt, current 219.7 s/eight attempts under a 500 s diagnostic budget | The current recorder instead throws at its 120 s guard; no current G13 analysis ledger exists |
| Recorder G13: 120.2 s, `budget.exceeded`; G06/G07 changed and await refreshed goldens | The complete merge correctly refuses; no partial or old-source substitution |
| Generator chunks: 172.7 s (1390 pass), pipeline 294.8 s (127 pass), mega 246.3 s (107 pass/4 fail) | Already 713.8 s before the remaining quick coverage; whole replay/player attempts reached the 540 s helper limit |
| Mega's actual quick generation guard is **60000 ms**, not 120000; its Nightmare design assertions are 3000/10000 ms times the test factor | Raising a recorder or harness watchdog does not make mega's performance assertions pass |

The mega correction is from `generator/tests/suites/mega.test.js:653-658`: its quick
`generate` calls `SG.budget.create({ms:60000})`. The 120000 `SLOW` is a harness argument;
the 120000 generation guard at line 895 is in the unrequested `SG_DEEP` branch.
`core/tests/harness.js:410-414` times promises, not synchronous CPU work.
At the default local factor 2 the Nightmare assertions are 6 s/20 s; actual runs must record
their factor. These are separate from the generation guard and the 540 s process ceiling.

**Existing authority, not a new ambiguity.** SA2-Q-S12's final answer says:
"Until the measurement, the existing attempt caps only." R5 compares 64/128/256/none on six
fixed cells and permits none to win. The old unmeasured 128 proposal was withdrawn. There
is no already-approved provisional default. R4's manual availability evidence exception does
not make a missing golden, timeout or failing quick suite acceptable.

The cost was anticipated, but the task pack's independently green b1 -> b2 -> b3 -> c -> d
acceptance sequence leaves the approved remedy unreachable. The analyst owns that task split;
the developer correctly stopped instead of changing caps, requests or assertions.

**Question: which recovery/acceptance arrangement is authorized?**

| Option | Arrangement | Effect and cost |
|---|---|---|
| **(a), recommended** | Keep b1 open; pull forward b2's correct measurement consumers and c's counter/allowance/shard instrumentation on the **requiredness-active working tree**; execute d's unchanged R5 experiment before one combined recovery acceptance. Run b3's early manual evidence after the selected default and before MS05e. The orchestrator records the changed prerequisite/commit boundary and absorbed scopes explicitly | No new numeric policy: Infinity until the existing rule selects a value. Final-source GG/GR and full quick coverage must complete before acceptance. Add G13/mega closure diagnostics outside the six-cell selector. A none winner or remaining budget/latency failure stops for a further explicit disposition; no automatic budget relaxation |
| (b) | Authorize a provisional finite additional local allowance in b1 before the measurement | 64 is the smallest experiment candidate, not a proved default; 128 was explicitly withdrawn and 256 is unselected. May lose required hits or fail to bind the slow work. Needs c's precise accounting anyway, fresh GG/GR, and the later full four-setting comparison; cannot be implemented by lowering the global `maxRatings` |
| (c) | Instrument and select on the inactive old-exactness path before activating b1 | **Not recommended / not a valid R5 measurement:** shallow in-band results still stop as exact before the tail being measured. Moving inactive instrumentation is possible; the actual selection must execute active requiredness semantics. A diagnostic active preview is (a)'s measurement, not an inactive baseline |
| (d) | Keep the current engine; authorize a named `MS05b1v` validation-tooling task for data-driven recorder/test guards, same-request G13 persistence if needed, and bounded full quick coverage | A 300 s G13 recorder guard would be a candidate above the observed 219.7 s generation, not a proved end-to-end bound or permission granted here. The analysis recorder always regenerates; a saved wire alone does not close it. Mega's separate 60 s guard and latency assertions remain unresolved. Recorder changes require fresh GR; GG can remain valid only if its own hashed sources/manifest are unchanged |
| (e) | Explicitly accept/document a slower interim or product validation contract, retaining all required correctness coverage and failed performance evidence | Requires a concrete decision on mega latency assertions/quick-test placement and completed validity evidence, not just larger watchdogs or a blanket waiver. Keep the 540 s process ceiling and named full coverage, or explicitly decide otherwise. R5 selection and final GQ/GP still cannot be skipped; Greater-Than CV6-01 remains separate |
| (f) | Replace G13's seed or requested level to regain a fast golden | **Not recommended:** changes the fixed request and removes this regression case, while leaving mega/search cost unresolved. Requires an explicit replacement coverage contract. Persisting the same G13 under (d) does not change its request |

**Recommendation details for (a).**

1. No standalone acceptance/commit claiming MS05b1-T05 passed; no discard/reset of its work.
   The orchestrator may accept a combined recovery only after its complete evidence, explicitly
   revising the pack's one-accepted-task/prerequisite boundary instead of fabricating green
   intermediate checkpoints. Revised task files are written after this answer.
2. Correct soak's pipeline route (`soak.js:281`, currently `r.rating.level === combo.level`)
   before measuring; use the authoritative exact flag and c's conserved per-request work.
   Apply all affected b2 consumer/manual duties in their assigned recovery scope.
3. Preserve the exact R5 selector: classic9 normal/master/nightmare, killer hard/expert,
   jigsaw9 expert; 12 derived requests each, seed base 20260101, each of 64/128/256/none.
   Every error counts; smallest finite setting with no per-cell exact-hit loss and a strict
   median-full-rating reduction wins, otherwise none. No changed floors, weights, attempt
   counts, parent-cancellation semantics or global rating/proposal caps.
4. A full-rating allowance is not a wall-time/proposal bound. It excludes earlier stages;
   memo/invalid proposals and uniqueness work can remain. G13 and the two mega Nightmare
   cells are not in the six-cell selection. Require original-request closure checks with
   work/time/attempt data; do not silently add them as tuning criteria or promise a finite
   winner fixes them.
5. Preserve the current no-extra-cap artifacts as historical evidence. Engine/instrumentation
   changes invalidate GG/GR source identities; record final-source complete E after closure,
   wire before analysis, then update the genuine G06/G07 pins. Keep every fixed request.
6. Full quick coverage may be a manifest of disjoint bounded suite/full-name shards, not a
   claimed faster whole command. Every assertion must run and be accounted for. A shard
   does not cure a request timeout, a mega latency failure or an incomplete merge.
   Keep MS05d's classic9 GD and MS05b3's early variant I5/CV3 obligations, with their existing
   explicit treatment of intermediate availability failures; regrouping loses no gate.
7. If the measured policy still cannot meet the existing gates, stop and bring those numbers
   back for a named validation/performance decision. Do not silently implement (b), (d) or (e).

All future measurements require the exclusive cross-repository timing slot and existing lock
protocol, one bounded command at a time. No timing probe or generation was run to raise this
question while Pentomino's final test is running. Nothing in this question changes S-OD1's
Greater-Than strategy/fallback or the accepted requiredness semantics.

**SA1 cross-check (claude-opus-5.5, 2026-11-13).** Independent of SA2. Read only: the code at `f788e02` and
the MS05b1 working tree, the MS05b1 evidence and `notes.md`. No generation or timing was run.

*SA2's facts are right*, with one anchor slip:
- Mega's quick guard is `SG.budget.create({ ms: 60000 })` (`generator/tests/suites/mega.test.js:654`); `SLOW`
  (`:18`) is the harness argument and 120000 the `SG_DEEP` branch (`:885`, `:895`); the latency check is `:695`
  and `:699`, factor 2 by default (`core/tests/harness.js:33-38`). The mega16 budgets are at `:40`, not `:42`.
  The evidence's "120 s budget of the test" for mega is wrong, as SA2 says.
- `generator/tests/soak.js:281` takes `exact` from the level on the pipeline route, which Killer and Jigsaw use
  (`:211`): three of R5's six cells would count shallow results as hits. It must be fixed before R5.
- S12's answer (line 368) and R5 (`report-detailed.md:380`) say existing caps only until measured; the six
  cells, 12 requests and four settings (288 requests) are at `report-detailed.md:385-392`.
- The G13 numbers agree in `evidence/MS05b1/evidence.md`, `notes.md` and the table above.

*Three facts that change the weighting of the options:*
1. A finite allowance can only remove hits. Each attempt uses its own streams (`rng.fork('grid#A')`,
   `'dig#A.T'`, `'search#A'`, `generator/js/engine/digger.js:1672-1755`) and the keeper does not steer the path,
   so a capped local search is a prefix of the uncapped one. "None" therefore wins whenever 256 loses one hit
   among the 72 requests. The evidence cannot rule that out: 74 of the 149 new required puzzles came only in
   attempts 2-8, after attempts that used up their caps, and nothing records where in an attempt a hit falls.
   "None" is a real outcome, and with it G13 and mega stay as they are.
2. R3 also lengthened the sample loop, which no R5 setting touches ("earlier layout/dig ratings do not consume
   it", `report-detailed.md:387`). A shallow sample no longer ends an attempt, so each runs up to 12 samples
   (`digger.js:625`, `:1724-1748`); from Nightmare on, every odd sample is a proposal dig refined down with up
   to 64 ratings (`:1233-1249`, `:1105-1123`). G13's whole old attempt took 0.16 s, which suggests its 48
   proposal samples cost little; if its 48 score-targeted samples are cheap too, the local searches are most of
   the 220 s and any finite winner brings G13 far under 120 s. For mega nothing shows that 8 attempts of 12
   samples fit 6 s (mega12) and 20 s (mega16) per request at factor 2, even with no local search at all.
   MS07b's non-vacuous Hell 1 brings the same question to mega's `hell1` tests (`mega.test.js:22`).
3. G13 does not need R5. The quick suites read the slow goldens from the saved wire (`steps.test.js:44-45`, as
   for G09-G12). G13 in the saved-wire manifest (an expansion that needs approval), a G13 recorder guard above
   its 220 s and a fresh GR close the three suites and the analysis merge for any R5 outcome, with G13's
   request unchanged.

*Options.* (a): agree as the frame, and it is executable: four sequential tasks on the open tree (b2's
consumers; c's counter and override at Infinity; d's 288 requests with closure diagnostics; final-source E,
complete quick shards and MS05d's GD), one acceptance at the end. About 3-4 developer hours and 1.5-2.5 hours
of locked machine time: R5 costs about 5 minutes per setting at "none" (GG means: classic9 Normal 0.36 s,
Master 0.14 s, Nightmare 4.8 s, Killer Hard 5.2 s; G09's Killer Expert 14 s), GG about 10 minutes, the three
measured quick chunks 714 s. By points 1 and 2 it may end where it started: SA2's step 6 keeps mega's latency
assertions, the likeliest stop. (b): not unsafe (a finite allowance changes which puzzle returns, never its
validity or its exact flag) and possibly enough for G13, but it needs the same counter, closure checks and E,
saves only R5's half hour, may need a second E refresh, and leaves the conflict for the day R5 selects "none".
(c), (f): agree, not recommended. (d), (e): agree they need named decisions; disagree that they can wait for
(a)'s stop: by points 2 and 3, G13 persistence and a mega decision are needed under most R5 outcomes.
Missed option, (g) dark landing: commit b1 with requiredness behind a run-time module switch, off by default
(the GG and GR checks must show `f788e02`'s outputs unchanged; b1's new explanation text waits), let b2 and c
land green, run R5 with the switch on through a soak override like `--shallow-cap` (the active path, so not
(c)), and turn it on with the selected value in one small final task that removes the switch. Every commit
stays green and no 3-4 hour uncommitted tree exists.

*Recommendation:* (a), amended. (1) First a profile of minutes under the lock: G13 and one mega12 and one
mega16 Nightmare request with `maxAttempts: 1`, reading the digger's `work` per attempt (`digger.js:1825`) and
the time of the samples against the local search. (2) R5 unchanged, with G13 and the mega Nightmare requests
measured at all four settings as non-selecting diagnostics, so that a "none" comes back with its trade-off.
(3) G13 persistence from (d) in the same recovery. (4) The owner decides now what the mega Nightmare (and
later Hell 1) quick tests assert when a request ends as a fallback, and that a "none" result stands. (5) (g),
or at least labelled "not accepted" checkpoint commits, instead of one large uncommitted tree.

**Plan-author answer:** not requested; the owner answered directly (below). The plan author may still comment.

**Owner (2026-11-13 06:45): (a).** Owner decision S-OD2. MS05b1 stays open. The measurement consumers of MS05b2
and the counter, allowance and shard instrumentation of MS05c are pulled forward onto the requiredness-active
working tree; MS05d's R5 experiment runs unchanged (64/128/256/none on the six fixed cells); one combined recovery
acceptance follows the complete final-source evidence. No new numeric policy, no automatic budget relaxation. A
"none" winner, or a G13, mega or quick-set failure that remains, stops the recovery for a further explicit
decision with the measured numbers.

**Orchestrator, how (a) is executed (2026-11-13).**

1. SA1's diagnostic points (1) and (2) are inside (a) ("G13/mega closure diagnostics outside the six-cell
   selector") and are adopted: a short work profile of G13 and one mega12 and one mega16 Nightmare request first,
   and the same requests measured at all four R5 settings as non-selecting diagnostics.
2. SA1's points (3) (G13 persistence, from (d)) and (4) (the owner decides now what the mega tests assert for a
   fallback) go beyond (a). They are not adopted now; if the recovery stops, they are put to the owner with the
   measured numbers.
3. SA1's point (5) and option (g) are not adopted. The branch gets no checkpoint commit before the combined
   acceptance. The orchestrator keeps the uncommitted work safe with a private backup ref outside the branch at
   each step: a commit object built from a temporary index (`GIT_INDEX_FILE` set to a temporary file,
   `git read-tree HEAD`, `git add -A`, `git write-tree`, `git commit-tree <tree> -p HEAD`), stored with
   `git update-ref refs/dv3-wip/<name>`; it includes untracked files and leaves the real index and the branch
   untouched (cross-review FS32: `git stash create` would miss new files). The first is
   `refs/dv3-wip/MS05b1-20261113-0650`.
4. SA2, the pack author, writes the recovery task files. SA1 cross-checks them before dispatch.

---

## PR-S1: review of the progress at the pause

**Raised by the orchestrator at the owner's request, 2026-11-13. Answer requested from Fable (plan author).**

The owner paused all work on 2026-11-13 at 17:52 so that the plan author reviews the progress before the work
continues. [working-status.md](working-status.md) gives the state at the pause (MS01 to MS05a committed;
MS05b1 and the recovery steps MS05r1 to MS05r4 done to their step evidence, MS05r4 stopped; sudoku waiting for
CV6-03 (c) since 13:35), the issues met and the resolution chosen for each, and the differences from the plan,
the analysts' report and the accepted task pack. The pause state is committed on `rating-v3`.

Requested:

1. The direction to take next: whether the recovery sequence (MS05r5, MS05r5m, MS05b3, MS05r6a, MS05r6b) and
   the rest of the pack continue as planned or change, together with the answer to CV6-03 (c) below.
2. Any difference in working-status.md section 5 that you do not accept, and what replaces it.

**Plan-author answer (claude-fable-5-2, 2026-11-13).** I read working-status.md in full and checked the code
anchors it relies on for CV6-03. The owner's four decisions of today are recorded here as **S-OD4**: the (c)
design of CV6-03 (both parts); the full scope stays (all six S3 groups, no deferral); a lighter process for the
remaining tasks; and, for the companion repository, the Hell levels (its PR-P1).

**1. Direction: continue, with one added task and a lighter process.** The work is on course for the original
goal, but slowly: 8 of 51 tasks, and three stops in MS05, all three about time and none about a wrong puzzle.
What has been built is sound and matches the intent: tiers and the reference floor (MS01), the baseline (MS02),
monotone orders with the derived certificate (MS04), and requiredness active in the engine (MS05b1). Hard is now
required to need a hard-tier technique; that part of the goal is implemented and waits only for its acceptance.

- *Sequence.* MS05r5p, MS05r5, MS05r5m, MS05b3, MS05r6a, MS05r6b, MS05r6c, the combined commit; then MS05e,
  MS06a to MS06d, MS07a to MS07e, MS08a to MS16 (every group, as the owner confirmed), MS17a, MS17b, MS18a to
  MS18e. Details of the first seven are in the CV6-03 answer below.
- *Why the stops happened, and what changes.* Requiredness was activated before the techniques of the upper
  tiers exist (S2.2, S3) and before the weights that make some cells unreachable can be looked at (Killer). In that
  intermediate state several cells have no required puzzle at all, and every test, recorder and guard written for
  v2's speed measured that state. This was foreseeable from the order PROC-S1 fixed, and I did not foresee it. The
  remedy is not to tune the intermediate state further, but to stop treating its speed as a blocker:
  - **Stops (owner, S-OD4).** A task stops for the owner only for a correctness failure (an invalid or
    non-unique puzzle, an unsound deduction, a wrong exact flag or warning, lost or corrupted evidence) or when it
    would have to change a recorded decision. A performance or availability finding (a guard, latency assertion
    or projection exceeded; a cell with few or no exact hits) is recorded as a named item with its numbers, routed
    to MS07e (first checkpoint) or MS18c/MS18d (final), and the task continues under the bounded-command rules.
    The item list is part of every task's final reply and of MS18e's audit.
  - **Reviews (owner, S-OD4).** The analysts cross-review only tasks that change generation or rating semantics:
    the remaining MS05 steps, MS05e, MS06b to MS06c2, MS07a to MS07c, MS13a to MS13c (the grouped graph), MS15a
    (the ALS enumerator), MS17b and MS18c. The technique tasks (MS08a to MS12, MS14a to MS14c, MS15b, MS16) follow
    one template: the first of them (MS08a) is cross-reviewed as the template; the others are checked by the
    orchestrator against it, and by the generic soundness and order-invariant suites, which are the real safety
    net for a new finder.
  - **Evidence.** Step evidence stays, but no new evidence class or tooling task is created to work around a slow
    intermediate cell; such a cell goes on the item list.
- *Expectation to hold the plan to.* S2.2 gives Nightmare and Hell 1 their own techniques, so classic9
  Nightmare (2 of 12 today) is expected to recover at MS07; S3 widens the hard tier. Killer Hard and Expert (0 of 12
  at every setting) are **not** expected to recover from S3: their tier is `cageSplit` and fish, and their band is
  reached through `ruleOf45` work. That is the weight question plan §6 deferred (`ruleOf45` 260 and `cageSplit`
  520, flagged in the v2 report). MS07e reports these cells; if they are hidden there, the owner is asked then
  whether the Killer weights are recalibrated inside v3 or the cells stay hidden until a later calibration. No
  weight changes before that answer.

**2. Section 5: every difference is accepted, with these remarks.**

| Row | Position |
|---|---|
| D1, allowance 256 | Accepted as the default. It is the approved rule applied as written; its basis is thin (one cell, a 5 % lower median) and it buys little, which the report says honestly. MS18b's recheck on the final technique set is the real test; no re-selection before it |
| D2, cost of requiredness | Accepted as a finding. It is a consequence of R3 that the plan underestimated ("cheaper than a full rating" was about the certificate, not about the search that follows a shallow result). No common bound on samples now: the size default of attempts (CV6-03 (c2)) bounds the large boards, the allowance bounds the local search, and the final qualification judges the rest. A sample-level bound may be proposed at MS18b with data, as its own decision |
| D3, D4, the recovery and the pause commit | Accepted. I would have preferred SA1's (g), an off-by-default landing that keeps every commit green; that is past. The pause commit is a checkpoint, not an acceptance; MS05r6b (with MS05r6c) remains the acceptance boundary, and the combined commit message says that the earlier pause commit was not green |
| D5, mega Nightmare out of the quick contract | Accepted. It moves a latency promise that requiredness made false; it does not weaken a correctness assertion, which is what plan rule 3 protects. The deep tier must keep every original request and relation |
| D6, G13 persisted | Accepted. With (c2) G13 also regains margin under the recorder's 120 s guard |
| D7 | Answered in CV6-03 |
| D8, the sharded and slower quick set | Accepted for the recovery. For the remaining 37 tasks it is a real cost (every task runs both quick sets); MS05r6b's standing-cost report must give the number per app. If the Generator quick set stays above about five minutes, MS07e proposes which generation-heavy quick cases move to the manual tier, as a named item, not a stop |
| D9, D10 | Accepted |
| D11, MS05e after the recovery | Accepted. CV6 stays red until then by S-OD1; it is a named item, not a blocker for the tasks before MS05e |
| D12 | Accepted |
| D13, the warning's wording | Accepted; "a technique from the {level} tier" is better than my text |
| 5.3 to 5.7 | Accepted |

**3. Records to bring in line when work resumes (pack author, before the first dispatch).** Check-list §2 and §4
get rows for S-OD3 and S-OD4 (G13 persistence allowed, the mega contract, (c1) and (c2), the stop rule, the review
rule); MS05r5, MS05b3 and MS05r6a get the amended prerequisite; MS05r5p and MS05r6c are written; the index
checkboxes of MS05r1 to MS05r3 follow the rule of check-list §1; the temporary branch `fable-q/cv6-03` can be
deleted.

---

## CV6-03: R5 selects 256, but mega Nightmare exceeds the existing limits

**Raised by SA2, 2026-11-13. Answer requested from Fable (plan author) and the owner.**
This is the further decision required by **S-OD2**, not a failed R5 selection. MS05r4 has stopped at the
original-limit mega preflights. Its results do not authorize MS05r5, MS05b3, MS05r6a or MS05r6b to pass those
failures, change a guard, move a test or persist G13 on their own.

Sources: [MS05r4 evidence](evidence/MS05r4/evidence.md),
[selection](evidence/MS05r4/selection.json),
[default and blockers](evidence/MS05r4/default-pin-manifest.json),
[G13 preflight](evidence/MS05r4/preflight/G13.json), and
[allowance report](shallow-cap-2026-11-13.md). The transcripts and diagnostic records linked there are kept as
failed/passing evidence under their actual identities; none is replaced by this question.

### The measured stop and the default

| Fact | Meaning |
|---|---|
| R5 selected **256**, eligible settings `[256]`, no measurement problem; 288 selecting requests, six fixed cells | Keep the result of the accepted rule. This is not permission to select 64 or 128 because they run mega faster |
| classic9 Nightmare: none = 2/12 hits, median 1,417 full ratings; 256 = 2/12, median 1,345 | A **5.08% reduction in the median rating count**, not a promised 5% speedup. It is the only cell whose median falls at 256; no cell loses a hit |
| 128 gives 1/12 and 64 gives 0/12 in that cell | Both are ineligible under R5, irrespective of their faster diagnostics |
| Default literal is now 256 at `generator/js/engine/digger.js:653`; source hash `9a833d9376381c6f9e2df4c5a79aba981bbd8a3dafce9e572ff2641bd61759ce` | The measured source was `19afa6ee…` with explicit overrides. MS05r4 verified that reverting only the new default literal recovers that source. The working tree remains uncommitted |
| G13 preflight: **104.712 s / 120 s**, eight attempts, shallow fallback, `exact: false`, `required: false`, score 1,637 | Passes the original generation guard, consuming 87.3% of it; about 15.3 s headroom |
| mega12 Nightmare quick group: seed 1 takes **48.202 s / 6 s** | One test fails its original latency assertion. The separate CV5 test passes in 137.7 s; that does not make the group pass |
| mega16 Nightmare quick group: **both tests throw `budget.exceeded` at 60 s** | Neither reaches a successful comparison with the separate 20 s latency assertion |
| Focused checks at 256: 463 + 30 + 16 pass; `pins: []`, `returnedPremises: []` | The two mega blockers are performance/contract decisions, not stale numerical pins or permission to undo requiredness |

The four-setting diagnostics use the unchanged fixed requests, normal eight-attempt configuration and a **500 s
diagnostic budget**. These are generation times, excluding command startup; they select nothing:

| Request | none | 256 | 128 | 64 | Ordinary samples alone |
|---|---:|---:|---:|---:|---|
| G13, samurai Nightmare, seed 42 | 220.5 s | 104.6 s | 86.7 s | 80.0 s | About 74 s at each setting; eight attempts, same shallow fallback |
| mega12 Nightmare, seed 3 | 65.1 s | 47.1 s | 43.8 s | 39.4 s | 37.5-39.1 s; eight attempts, same shallow fallback at every setting |
| mega16 Nightmare, seed 3 | 388.7 s | 310.2 s | 296.3 s | 270.4 s | 263.2-281.3 s; same exact, required puzzle at attempt 6 at every setting |

The allowance acts on local continuation, not these earlier samples. Consequently it cannot meet the old mega
limits for these requests even if the remaining local continuation were free. This is the predicted sampling
cost identified in SA1's CV6-02 cross-check, now measured.

**256 stays the global default for this recovery under (a), (b), (d), and a mega-specific (c).** This question does
not reopen the six-cell selector or turn mega diagnostics into selection criteria. A proposed change to common
sampling/rating behavior that also changes the selector's semantics would need separate authorization/evidence;
it cannot be smuggled in as a mega-only exception.

### What the browser actually permits

The Generator uses **120,000 ms of active generation time**, with no mega-specific increase:

- `generator/js/worker/worker-client.js:45,198,434,468`: the default is 120000, sent to the worker or used by the
  cooperative main-thread client.
- `generator/js/worker/gen.worker.js:97,249-268`: the worker applies the same default and active clock.
- `generator/js/ui/app.js:1191` uses that client without a larger mega budget; the cache's worker-only background
  client also uses the default (`js/ui/cache.js:692-694`). The legacy direct client has a 120000 ms wall-clock
  guard as well (`app.js:110,349`).
- Default attempts are eight (`js/ui/store.js:35`, `js/engine/pipeline.js:26,73`). The advanced control permits
  1-20 attempts; it does not expose a longer time budget.
- Time yielded to the page is excluded from the active clock (`core/js/engine/budget.js:95-113`), so 120 s active
  is **not** a two-minute wall-time guarantee. Checks are sampled, not an instantaneous wall-clock kill.

For the measured mega16 seed 3 path, even its 278.1 s of ordinary samples at 256 exceeds the application's 120 s
allowance. At comparable engine throughput it reaches that budget before its exact sixth attempt; it does **not**
normally finish successfully after five minutes. Its first two attempts consume about 109 s in the diagnostic,
with no exact hit. A larger-budget run can finish in about 310 s, but that is the diagnostic, not the current UI
contract.

A budget failure is not converted into the best-so-far puzzle: `digger.js:1791-1798` and `pipeline.js:156-160`
rethrow it, the worker sends an error (`gen.worker.js:191-198`), and the app clears the unfinished result and
shows the failure (`app.js:850-863,883-886`). The ordinary fallback is returned when the attempt limit is
exhausted normally, not on this exception. Mega12's measured 47-48 s run fits 120 s on this machine, but still
costs tens of seconds and returns a truthful shallow fallback.

The standalone Player imports/plays puzzles; it does not run the Generator's generation client. Its import
solver guard is 6 s (`player/js/ui/importer.js:40,731`), a different operation and not a generation allowance.
An unavailable Generator result cannot be made available by changing a Player guard.

**Evidence versus inference:** no browser or new generation was run for this question. The budget and error path
above are code facts; reaching 120 s for this fixed request is the implication of the recorded work/times on
comparable hardware, not a measured browser run or a claim that every seed and device behaves identically.
Under v2 the early shallow puzzle could be returned quickly while falsely counting as Nightmare. Restoring that
old exactness test is not a valid speed fix.

### Question: which contract is authorized?

Options may be combined; **(d) is an adjunct, not a resolution of the mega failures**.
The new task IDs below are proposed ownership, not dispatch authorization or task files created by this question.

| Option | Scope and named owner | Effect and remaining obligation |
|---|---|---|
| **(a) Change the mega Nightmare validation tiers — recommended for the recovery** | Add **MS05r5m, mega Nightmare validation contract**, after r5 tooling and before b3/final E. Move normal-attempt mega Nightmare generation from routine quick coverage to an explicit slow/manual contract. Quick coverage checks bounded behavior, including a real one-attempt smoke where affordable and a focused shallow-fallback case; keep validity, uniqueness, givens/solution agreement, solver soundness and truthful exact/warning assertions | Changes test organization and explicitly replaces the old quick latency promise, not product generation. Preserve the full original requests/relations in mandatory slow evidence before combined acceptance. Choose guards from complete measurements with stated margin; no global `SG_TIME_FACTOR` change. The UI's 120 s problem remains unless separately disposed of under (c); this is not product qualification |
| **(b) Accept normal-attempt mega Nightmare as slower quick work** | The same **MS05r5m** owns the explicitly approved per-board request guards and latency assertions, their documentation and internal request sharding | Keeps the production algorithm and 256, but makes complete quick validation much more expensive. Raising only `SLOW`, a harness timeout or a time factor does not fix the 60000 ms generation guard. With larger test budgets the UI still has 120 s. Raising the application's budget too would be a separate, explicit minutes-long product contract, not implied by this option |
| **(c) Change the large-grid product policy** | Fable specifies a concrete mega-only policy; proposed **MS05r5p, mega Nightmare product policy**, owns it before final-source E if selected now. Possibilities: deterministic bounds on ordinary sample/attempt work, returning a fully rated truthful fallback; or stop offering mega16 Nightmare until it can be qualified | An attempt cap of one would lose the observed required hit at attempt 6; that is an explicit availability trade-off, not an R5 result. Lowering only the shallow allowance cannot solve the sample cost. One attempt is not automatically a 6 s/20 s request. A withdrawn offering needs explicit controls/settings/refusal behavior, EN/VI documentation and continued opening of existing puzzles; no silent change of a stored/requested level. Any affected fixed regression request remains accounted for under the approved contract, not deleted |
| **(d) Persist the same G13 — recommended alongside (a)** | Expand **MS05r6a**, before its final-source recording, to own adding G13 to the saved-wire manifest/loader and related fixture tests. It then records five wires (G09-G13), still fourteen analyses (G01-G14), and all 520 GG keys | Removes repeated ~105 s G13 regeneration from quick consumers without changing seed 42, requested Nightmare, attempts, puzzle validity or requiredness. It does not fix mega and does not by itself remove the recorder's own 120 s risk: `replay-goldens.js:23-45` still regenerates every analysis request. Keep that guard unless a separate G13-specific margin is explicitly approved; if fresh recording fails, stop rather than substitute the earlier record |

**The bounded-coverage detail matters for both (a) and (b).**

1. The existing mega Nightmare population is seeds **1,2,3,4** for invariants, plus independent calls **3,3,4**
   for CV5, per board (`mega.test.js:690-712`). Preserve those requests and the same-seed/different-seed comparisons.
   At the seed-3 diagnostic cost, three mega16 calls would take about 931 s and four about 1,241 s: neither callback
   fits 540 s. Merely moving a callback to a slow tier or increasing its timeout is insufficient.
2. MS05r5m must authorize and implement single-request bounded records plus reconciliation of all original
   assertions/relations, with relevant source/config/seed/harness/guard identities and no missing or duplicate
   coverage. Quick replacements are a separate inventory. Do not silently drop repeats, replace seeds or run the
   existing whole `SG_DEEP=1` branch: it has its own 20-seed loops and 120 s generation guard.
3. A one-attempt quick contract also needs honest bounds. The measured first-attempt prefixes at 256 are about
   **5.2 s for mega12 and 56.7 s for mega16**; these are not new one-attempt validation runs or upper bounds.
   In particular, "one attempt" does not preserve mega16's old 20 s assertion. A scripted control may check the
   stop/fallback mechanism cheaply; moved full-request correctness coverage must still run.
4. Only seed 3 has completed full-request mega16 timing here; seed 1 has a 60 s cutoff, and other quick seeds'
   full costs are not established. Guards must be chosen from bounded measurements of the complete fixed
   population, not copied from this one successful diagnostic. The existing 500 s diagnostic ceiling and
   **540 s per process** remain; a request that cannot finish inside the allowed bound returns to the owner.
   Roughly 42 minutes for all fourteen full calls, if the other seeds cost like seed 3, is a planning projection,
   not a measured upper bound. Option (a) moves that cost out of ordinary quick runs; it does not erase it.
5. Test-contract changes do not silently rewrite design/qualification targets, accept every fallback as exact,
   or qualify a level because its score label matches. Record the old 6 s/20 s failure and the new contract.
   All other levels, G14, S-OD1's CV6, uniqueness and correctness obligations stay unchanged.

### Recommendation and the product decision

**Recommend (a) + (d), retain 256, and do not adopt (b) as a blanket larger-budget fix.** This separates routine
correctness checks from expensive full generation and avoids repeatedly exposing G13's small time margin.
It preserves the requiredness improvement instead of hiding the cost in another timeout.

**Fable and the owner must also explicitly dispose of the product issue in (c).** Prefer an evidence-based
bounded-effort policy which can return a truthful result within the existing application allowance; if no
acceptable policy can be demonstrated, do not continue offering an unqualified mega16 Nightmare service.
Do not silently raise the browser's budget to five or more minutes. The owner may authorize the test-only
recovery to land first as an acknowledged interim limitation, but that must carry a named product/qualification
blocker into MS18c/MS18d and **no publication** while it is unresolved. A test-tier decision alone is not consent
to the current user-visible timeout.

If the owner instead requires product closure within this recovery, MS05r5p must precede the new mega closure
evidence and final-source E. Fable must specify the ordinary-work/attempt/offering policy, its scope and its
compatibility consequences before that task is written. No numeric large-grid policy is authorized here.

### Resume path after the answer

The old "passed original mega limits" prerequisites cannot simply be ticked. After the answer, the pack author
replaces them with the chosen named contract and retains MS05r4's failures as the reason. No frozen r4 code,
helper or evidence is rewritten. No task below starts just because this question is ready.

| Choice | MS05r5 | MS05b3 | MS05r6a | MS05r6b |
|---|---|---|---|---|
| (a) | Resume inventory/exact/results tooling under an amended prerequisite; then MS05r5m creates the new quick/slow mapping and replacement preflight evidence. r5 itself does not run the expensive callbacks | Run after the test migration, with the selected default, unchanged I5/CV3 seeds/counts and existing guards. Refresh the draft inventory for its added tooling | Require compatible passing evidence of the **approved replacement** mega contract, not fictitious passes of the old one; complete final-source GG/GR and legitimate pins. Apply (d) first if approved | Final quick inventory plus the separately mandatory slow mega coverage, classic9 GD and every b3 obligation; reconcile retained evidence by actual identities. Report total cost and the explicit product blocker if closure was deferred |
| (b) | Add only the authorized tooling; MS05r5m defines measured guards and bounded per-request quick shards before inventory is final | Same preserved manual contract; no implied increase of a manual or application guard | Recheck the authorized new mega bounds with margin, then final-source E; G13's 120 s rule remains unless (d)/a separate decision changes its ownership | Run every retained quick request/assertion in bounded shards, not the overlong old compound callbacks. Publish the much slower standing quick cost; product timeout is still unresolved without a product decision |
| (c), implemented in this recovery | Tooling may precede the product task, but the final draft and mega contract follow MS05r5p/MS05r5m. Keep global 256 | Use the final product policy. Any change of supported requests/refusal coverage must be explicitly specified; do not silently shrink CV3 | Recheck all affected closure requests on the new source, then fresh GG/GR. Old r4 diagnostics stay historical. Retain all fixed keys/requests with explicitly approved outcomes | Fresh final-source quick/manual/product evidence, including the real browser budget/cancellation/error or fallback contract; no mixing of old-source results or availability claims |
| (d), added to any viable mega option | Account for the saved-wire change when refreshing inventories; do not change harness behavior to bypass G13 | No change to its manual populations or hit requirements | Own the persistence-tooling changes before freezing E; wire before analysis; five wires, fourteen analyses, 520 keys. The fresh G13 analysis is still mandatory | Quick consumers use verified current-source G13 wire; reconcile changed fingerprints and keep the one-time recording/closure evidence. (d) alone leaves both mega blockers unresolved |

**MS05b3 is not a back door around the remaining cost.** Its manual variants generator has a separate
**240000 ms request guard** (`generator/tests/manual/variants.test.js:75-79`), and mega16 CV3 retains two requests
per supported level. Those particular requests were not measured by the seed-3 diagnostic. If a level's combined
callback is overlong, (a)/(b) may authorize a further **tooling-only per-request decomposition in MS05b3**, preserving
its full population and aggregate assertions. They do not automatically raise its request guard. A request
timeout, correctness failure or missing coverage remains an owner stop; only the already accepted, named
intermediate aggregate-availability exceptions may remain as failures. No claim is made that changing the quick
tests alone guarantees the rest of recovery will pass.

The single combined acceptance/commit boundary of S-OD2 remains. All implementation/fixture changes must precede
their final-source evidence; a meaningful change invalidates affected records rather than being patched into
their hashes. The 540 s execution ceiling, serial timing slot and 15 s inter-run gap remain; the new 20-minute
lock-acquisition wait is not a longer generation budget.

**Answers requested:** (1) (a) or (b), or a concrete (c) with its validation contract; (2) (d), yes or no, with any
G13 recorder-guard change stated separately; (3) whether product closure under (c) is required before combined
recovery acceptance or may follow under an explicit no-publication blocker. Fable supplies the product/performance
contract; the owner authorizes the trade-off.

**SA1 cross-check (claude-opus-5.5, 2026-11-13).** Independent of SA2. Read only: the working tree on `f788e02`,
the MS05r4 evidence with the `attemptSummaries` of `diagnostic/256/*.json`, and the report. Nothing was run.

*SA2's facts are right*, with two anchor slips: the active clock is `core/js/engine/budget.js:97-115`, and the
worker posts the error at `gen.worker.js:199`.
- Mega: guard `SG.budget.create({ ms: 60000 })` (`generator/tests/suites/mega.test.js:654`), Nightmare budgets
  3000/10000 ms (`:31`, `:40`) times 2, or 3 with `CI` (`core/tests/harness.js:33-38`); the quick levels omit
  expert, master and hell2 (`:22`). App: 120000 ms in both clients and the worker; 1-20 attempts, 8 by default.
- After 120 s of active time the user sees the result cleared, the empty board and the toast "Could not generate
  the puzzle: Generation took longer than allowed and was stopped. Try again, use another seed, or pick an easier
  level." (`app.js:850-865,1319`, `locale.en.js:556-557`; VI `app.js:1331`, `locale.vi.js:540-541`). For mega16
  Nightmare only the last advice helps: attempts 1-5 cost 36.5-59.2 s each, so 120 s holds two (109 s), and
  seed 3 hits in the sixth; one attempt would give a truthful fallback after about 57 s (inferred). mega12 costs
  5.2-6.6 s per attempt (47 s for eight), G13 8.8-17.9 s (105 s, 87% of 120 s).

*Facts that change the weighting:*
1. The product side is already decided: the final qualification sets the offers (SA1-Q-S5, MS18c). A hit is exact
   without `difficulty.approximate`, a timeout is a miss, and a large-board level needs at least 36 of 40 hits and
   a p95 within 30 s (`docs/difficulty-rating/qualification.md:11-25`). A hidden level is a valid outcome
   (check-list §6, plan §8); the store moves a stored one to the nearest offered level with a note
   (`store.js:169-208`), the pipeline refuses it (`pipeline.js:59`), and intermediate work is not deployed
   (check-list §6; Pages deploys on a push to `main`). v2 offered Nightmare 40/40 with p95 268 ms (mega12),
   944 ms (mega16) and 891 ms (samurai) (`qualification.md:132,141,195`); the three v3 requests give one exact
   hit at 310 s and two fallbacks. Unless generation becomes much faster, MS18c hides Nightmare on mega16, very
   likely on mega12 and samurai, and maybe other large-board levels that no quick test samples. SA2's second (c)
   branch is thus what MS18c does anyway; its preferred bounded fallback keeps no level offered, because
   fallbacks are misses.
2. Turning `budget.exceeded` into the best puzzle so far is excluded: the digger counts work instead of time to
   keep a seed's puzzle the same on every machine, and the 120 s guard stays an error (`generator/design.md:705`).
3. Unless the answer covers CV3, the recovery stops a third time. CV3's mega16 Nightmare cell (seeds 1-2, the
   configs of `mega.test.js`'s seeds 1-2) projects at about 620 s at seed-3 cost: b3 defers it, r6b stops
   (`MS05r6b-quick-gd-and-combined-acceptance.md:140-148`), and a request over the 240 s guard blocks (`:144`).
4. No task owns CI. `pull-request.yml` runs every generator suite, manual ones included, in five jobs of at most
   30 minutes with factor 3, and `pages.yml` runs them before it deploys; the `rest` group picks up any new
   `tests/suites/*.test.js` or `tests/manual/*.test.js` file (`.github/scripts/generator-suites.sh`).

*Options.* (a): agree, under three conditions. (i) The slow tier is a tool like `tests/difficulty-recovery.js`,
not a `*.test.js` suite, or CI's `rest` job must fit its 42+ minutes into 30. (ii) It runs once, after the last
engine change (r4's literal), one full request per locked run with the 500 s diagnostic budget, keyed by request
identity: r6b reconciles instead of rerunning, and b3's CV3 mega cells reuse the puzzles with CV3's checks. About
45 minutes at seed-3 cost; a mega16 seed with no hit costs about 420 s for eight attempts (475 s at the slowest
attempt), inside 500 s. (iii) Quick keeps a real one-attempt mega12 Nightmare request through the existing
`extra` argument (`mega.test.js:653-656`; 5-7 s measured, so not the old 6 s assertion) and, for mega16 (57 s
an attempt), only a scripted stop control. (b): agree it is no fix: mega16 adds about 36 minutes to every quick
run and to CI; mega12 alone (about 5.5 minutes) is possible but not worth it. (c): disagree with the framing.
Point 1 decides the product, so no MS05r5p in the recovery, and numbers chosen now would not survive S3's
techniques. The owner's real question is whether the likely hidden large-board levels are acceptable for v3; if
not, a large-board generation-speed task after S3, measured against MS07e's first checkpoint, before MS18c.
(d): agree; it also keeps G13's 87% away from the 120 s regeneration in `steps`, `replay` and `player`
(`steps.test.js:45`, `replay.test.js:26`, `player.test.js:34`) on slower CI runners.

*Missed:* qualification-based non-offering as the product answer (point 1); CV3's mega cells decided now
(point 3); a named owner for the v3 pull request's CI jobs before the merge (point 4).

*Recommendation:* (a) with (i)-(iii), (d), and 256 kept; there I agree with SA2, and on refusing a silent
browser-budget raise. On SA2's question (3): qualification closes the product side and check-list §6 forbids
deploying, so no new blocker; the owner should accept or reject the likely hiding with this evidence now.
Extend (a) to CV3, with the owner's explicit consent, as r6b blocks on timeouts today: b3 takes the mega
Nightmare cells from MS05r5m's records with CV3's per-puzzle checks; a request time over 240 s goes to
MS07e/MS18c as a named availability item, while validity, uniqueness, requiredness and the warnings still block.
Resume: r5 (tooling, amended prerequisite), r5m (about 2 developer hours, 45-65 minutes locked), b3, r6a ((d)
first), then r6b, which reconciles r5m's records and hands MS18c/MS18d the at-risk cells and the CI item.

**Owner (2026-11-13 14:25): (a) + (d), and (c) decided now.** Owner decision S-OD3. 256 stays the default.
(a) mega Nightmare leaves the quick contract for a measured deep tier, with SA1's conditions (i)-(iii) as its
execution detail (a tool, not a `*.test.js` suite; one run after the last engine change, keyed by request identity;
the quick set keeps a one-attempt mega12 request and a scripted mega16 stop control). (d) G13 is persisted.
(c) the product disposition for large grids is decided now, not deferred to publication: the plan author designs it.

**Plan-author answer requested (Fable): design (c).** For the large grids (mega12, mega16, samurai and any other
cell the measurements show), say what the product does for Nightmare (and Hell where it applies) given the numbers
above and the apps' 120 s active-generation budget: for example a size-dependent bound on attempts or work with an
honest result, or the level not offered on that board, or another design. Please also say (1) whether (a)'s
extension to MS05r6b's CV3 mega16 Nightmare cell is still needed under your design, (2) whether the CI workflow
item (SA1's cross-check) needs a task now, and (3) where the change goes in the recovery sequence (MS05r5, MS05r5m,
MS05b3, MS05r6a, MS05r6b). SA2 then writes the tasks and SA1 cross-checks them.

**Plan-author answer (claude-fable-5-2, 2026-11-13), with the owner's decision S-OD4 taken on the command line the
same day: design (c) has two parts, both approved by the owner.**

**(c1) What is offered is decided by the final qualification, for every board and level.** This is R24 and
SA1-Q-S5 applied without exception to the large grids and to Nightmare and Hell: a cell is offered only with at
least 36 exact hits of 40 (or 90 of 100) and a p95 inside its budget (30 s for boards over 81 cells); a cell that
fails is hidden at MS18c, the store moves a stored request to the nearest offered level with its note and the
pipeline refuses it. SA1's reading is right and is adopted: a bounded fallback is a miss and does not keep a level
offered. No large-grid level is hidden now, before S2.2 and S3 change the proofs, and no browser budget is raised.
The interim state (levels offered that will probably be hidden) exists only on the undeployed branch.

**(c2) The default number of attempts depends on the board size.** New in this recovery:

```text
defaultMaxAttempts(cellCount) = 8   for cellCount <= 81    (classic4/6/9, diagonalX, hyper, jigsaw9, killer,
                                                            greaterThan, wordoku: unchanged)
                              = 4   for 82 .. 144          (mega12, butterfly)
                              = 2   for cellCount > 144    (flower 189, mega16 256, sohei 288, samurai 369)
```

- *Why.* Since requiredness, a request that meets no required puzzle runs every attempt (working-status D2).
  On a large board one attempt already costs seconds to a minute, so attempts beyond the first few cannot make a
  request fit the 30 s qualification budget; they only turn a miss into the app's 120 s error. With the size
  default such a request ends with the truthful fallback and its warnings instead. Estimates from MS05r4's
  per-attempt times at 256 (not new measurements): G13 about 27 s instead of 105 s, mega12 Nightmare about 24 s
  instead of 47 s, mega16 Nightmare about 110 s instead of 310 s. The exact hit of mega16 seed 3 at attempt 6 is
  given up knowingly: a 310 s hit can never qualify.
- *What it is not.* Not a time rule (the puzzle of a seed stays the same on every machine), not a change of the
  allowance (256 stays, with R5's selection and MS18b's recheck as written), not a bound on samples inside an
  attempt, and not a change for boards of at most 81 cells. An explicit value still wins: the advanced control
  keeps its range 1 to 20, and a caller's `maxAttempts` is used as given.
- *Where.* One function, exported once and used by both defaults: `generator/js/engine/pipeline.js`
  (`DEFAULT_MAX_ATTEMPTS`, lines 26 and 73) and `generator/js/engine/digger.js` (lines 624 and 1807). The store's
  default (`generator/js/ui/store.js`, `MAX_ATTEMPTS.default`) becomes the size default of the selected variant:
  a stored value equal to the old default 8 on a larger board is read as "default" once and follows the new
  default; any other stored value is kept. The control shows the effective default. Strings, if a hint is added,
  in English and Vietnamese.
- *Tests.* The function at 81, 82, 144, 145; pipeline and direct digger agree; an explicit 8 on mega16 still runs
  eight attempts; the store migration; a mega12 request that ends shallow after exactly four attempts carries
  `difficulty.approximate` and `difficulty.shallow`. The qualifier and the soak use the default (they must not
  pass 8 explicitly); record that in their headers.
- *Documents.* `generator/design.md` (the pipeline options and §6.8), both developer guides, both user guides
  (the advanced control's default).

**Sub-question (1), CV3's mega16 Nightmare cell.** The extension is still wanted, in the narrow form SA1
proposed. With two attempts a mega16 Nightmare request projects at about 110 s, under the 240 s request guard, and
the two-request cell at about 220 s, under the 450 s projection limit, so the cell should no longer be deferred. It
is an estimate: if a request still exceeds 240 s, it is recorded as a named availability item for MS07e and MS18c
and does not stop the recovery, while validity, uniqueness, requiredness and the warnings still block. MS05b3 may
take these puzzles from MS05r5m's deep-tier records with CV3's own per-puzzle checks instead of generating them
again. The same rule applies in advance to mega's `hell1` quick tests when MS07b makes Hell 1 non-vacuous.

**Sub-question (2), CI.** Yes, a task now, small and inside the recovery, because the recovery is what breaks
the workflows: **MS05r6c, CI workflows for the v3 test tiers**, after MS05r6b's evidence and inside the same
combined commit. It makes `.github/scripts/generator-suites.sh` and the two workflows run the bounded quick
manifest of MS05r5 in jobs that fit their 30 minutes, keeps the deep tier (a tool, S-OD3 (a) (i)) out of CI, and
states in the workflow which evidence replaces it. It does not raise `SG_TIME_FACTOR` or a job timeout. From then
on each task that adds a suite owns its CI group, and MS18e checks the workflows once on the final tree. The
owner of the v3 pull request's CI is MS18e.

**Sub-question (3), the place in the sequence.** One new task and no reordering of the rest:

| Order | Task | Change |
|---|---|---|
| 1 | **MS05r5p, size-dependent default attempts** (new; S, about 40 minutes plus its checks) | First, because it is an engine change and everything after it measures the final source. It ends with the three closure requests (G13, mega12 and mega16 Nightmare seed 3) run once each as diagnostics under the lock, to replace the estimates above by numbers |
| 2 | MS05r5 | As written, with the prerequisite amended from "passed original-limit preflights" to "S-OD3 and S-OD4 contracts" |
| 3 | MS05r5m | As S-OD3 (a) with SA1's conditions (i) to (iii). The deep tier runs the fixed population with the default attempts of each board; the quick one-attempt mega12 request and the scripted mega16 stop control stay |
| 4 | MS05b3 | As written, with sub-question (1) |
| 5 | MS05r6a | (d) first, then the final-source recheck and the complete E (five wires, fourteen analyses, 520 keys) |
| 6 | MS05r6b | As written; it reconciles MS05r5m's records |
| 7 | MS05r6c | CI (sub-question (2)); then the combined commit |

MS05r5p invalidates MS05r4's diagnostic times for the large boards only (the selection cells are all 81-cell
boards, whose default does not change), so R5's selection of 256 stands without a new run.

**What is left for the owner later, named so that it is not rediscovered:** if MS07e's first checkpoint shows
large-board Nightmare or Hell cells hidden and the owner wants them back, the remedy is a generation-speed task
for large boards after S3 (SA1's proposal), not a larger budget and not a weaker exactness test.

Only existing evidence was read and summarized, and the budget path was inspected. No new generation, timing
experiment, browser run, source change, fixture write, staging or commit was performed to raise CV6-03.

---

## Owner decisions — current resume register

This register is a navigation aid, not a rewrite of the questions or answers above. The later decision governs
where an earlier recovery/process rule conflicts. The pause commit is a historical checkpoint, not acceptance.

| ID | Decision and authority |
|---|---|
| S-OD1 | Owner, 2026-11-12 18:20; Part H CV6-01. MS05e owns the bounded guided sign dig and its fixed fallback options. Its algorithm and unchanged CV6 target remain; S-OD4 supersedes a performance-only stop. A changed target or another strategy still needs a decision. |
| S-OD2 | Owner, 2026-11-13 06:45; Part H CV6-02. Preserve active requiredness and step evidence, with private backups owned only by the orchestrator and one combined acceptance. The owner later ordered the non-green pause commit. No further branch commit until r6b's audit and r6c's CI closure are accepted together. |
| S-OD3 | Owner, 2026-11-13 14:25; CV6-03. Keep 256; (a) move full-attempt mega Nightmare out of quick coverage into a tool-based deep tier preserving every original request and relation, with SA1's conditions (i)-(iii); quick retains real one-attempt mega12 and scripted mega16 controls. (d) persist unchanged G13 at MS05r6a. Fable supplies (c), now answered by S-OD4. |
| S-OD4 (c1) | PR-S1 and CV6-03, Fable with the owner's same-day approval. Final qualification determines every offer without exception: at least 36 exact hits of 40 or 90 of 100, and p95 within the board's budget (30 seconds above 81 cells). Bounded fallbacks and timeouts are misses. Failed cells are hidden at MS18c; stored requests move to the nearest offered level with the note; the pipeline refuses hidden requests. No interim pruning or browser-budget increase. |
| S-OD4 (c2) | One exported `defaultMaxAttempts(cellCount)`: 8 for <=81 cells, 4 for 82-144, 2 above 144; pipeline and direct digger share it. The selected-variant store default follows it. Legacy stored 8 on a larger board is migrated once to default mode; other stored values and explicit values remain. The control keeps 1-20. MS05r5p owns implementation, tests, bilingual guides and three locked diagnostics; R5's 256 stands. |
| S-OD4 scope | All S0-S3 and S2.3 remain, including all six S3 groups; no deferral. The companion repository's Hell decision is recorded under P-OD9 there, not a change to Sudoku's nine-level ladder. |
| S-OD4 stops | Stop for the owner only for correctness (invalid/non-unique puzzle, unsound deduction, wrong exact flag/warning, lost/corrupted evidence) or a proposed change to a recorded decision. A guard/latency/projection exceedance or few/no exact hits becomes a named item with its numbers, routed to MS07e first and MS18c/MS18d finally; continue the task within the existing command bounds. Keep failed/incomplete outcomes honest. Every task's final reply includes the item list; MS18e audits it. |
| S-OD4 reviews | Analysts cross-review the remaining MS05 steps, MS05e, MS06b-MS06c2, MS07a-MS07c, MS13a-MS13c, MS15a, MS17b and MS18c. MS08a is cross-reviewed as the technique template; the orchestrator checks other technique tasks against it and the generic soundness/order-invariant suites. No routine analyst review of the other tasks. |
| S-OD4 evidence and CI | No new evidence class or tooling task to work around a slow intermediate cell. MS05r5m keeps its approved deep records; MS05b3 may reuse matching records with CV3's own checks, and >240 seconds is an availability item, not a recovery stop. MS05r6c makes both workflows use the bounded quick manifest, deep outside CI, no factor/timeout increase. Later suite-adding tasks own their CI group; MS18e owns the v3 PR's CI and final workflow audit. |

Dispatch: MS05r5p -> MS05r5 -> MS05r5m -> MS05b3 -> MS05r6a -> MS05r6b -> MS05r6c -> combined commit ->
MS05e -> the remaining serial index. The combined subject remains
`difficulty-v3 MS05: required exactness with measured bounded recovery`; its body must state that pause commit
`a7f6660` was not green and was not acceptance, and include r6c's CI changes.
