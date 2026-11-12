# Rating v3: clarifications for the plan author

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
