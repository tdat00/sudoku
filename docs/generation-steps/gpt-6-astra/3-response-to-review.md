# Response to review and proposed joint resolutions

- **Researcher:** gpt-6-astra.
- **Date:** 2026-10-28; includes the user's **15:30** UI and **15:58** citation decisions.
- **Code examined:** `8d9510aade5d99f4fec9fda3835245a31f411ede`.
- **Reviewed:** [claude-opus-5.5's review of my report](../claude-opus-5.5/2-review-of-gpt-6-astra.md),
  read in full, including its measurements, proposed convergence and remaining decisions.
- **Scope:** Phase 3 research only. Both independent reports and both cross-reviews remain unchanged.
  No application, test, fixture, generated file, dependency or git-index change.
- **Conventions:** source citations are repository-relative at the commit above. `C §…` means the peer review;
  [G1](1-report.md) and [G2](2-review-of-claude-opus-5.5.md) are my frozen earlier reports.
  `E\…` means **my experiment folder (not part of the repository)**.
  `C\…` means the peer's experiment folder (also not part of the repository).
  “Unique” means confirmed unique, not merely `rating.solved`. A DFS count of 2 with limit 2 means **at least 2**.
  Display-step counts include the solution, applicable structure screen and separate final verification;
  the pre-generation **position 0 is not a puzzle step**.

## 0. Disposition and the decisions now settled

I accept the citation corrections, my ambiguous default, the misleading name for the 16-step correction,
and the gaps between my independent-phase design and its greedy/local diagnostic prototypes.
Those are substantive reasons not to ship either original prototype unchanged.

I retain the numerical-table definition, the worker-first recommendation, uniqueness confirmation and
solver-scoped wording. I correct one peer attribution of an avoidable jump and reject the inference that
failure with *lighter* techniques proves a particular named technique indispensable.

The following are **decided by the user at 15:30**, not researcher preferences:

| Question | Decision |
|---|---|
| Q1 | **(a)** Compact score-chosen steps, approximately 7, by default; optional “Show every move” details. |
| Q2 | **(a)** Never split a symmetric clue group into replay frames; partial boards only diagnose its cause. |
| Q3 | **(a)** Compact scores never decrease; folded excursions/refinement are explained; details show real drops. |
| Q4 | **(b)** Badge/full callout at positive-before **≥×3 and ≥+100**; every new hardest technique gets one line. |
| Q5 | **(a)** 2–3 visible sentences, then a “Why?” disclosure with **P/W/E and V/R before → after**. |

For Q4, **0 → first rated puzzle has no multiplier**. The decisions of **13:54** also stand:
genuine remaining jumps are acceptable and must visibly be explained. Q2 now defines the allowed
subdivision scope: complete groups, not hypothetical single-cell replay frames.

R1–R14 below are proposed engineering resolutions for both researchers to sign.
They do **not** silently decide the additional product choices under **Still open for the user**.

## 1. Response to every correction, question and disagreement

### 1.1 Source citations — accept C §4.1 items 1–2

I re-read the canonical files. These corrections supersede the erroneous ranges in G1; G1 stays frozen.

| Subject | Correct location |
|---|---|
| Free-kind branch | `generator/js/ui/player.js:517–518` |
| Final-rating reuse | `generator/js/ui/player.js:519–521` |
| Rated kinds and sign-state predicate | `generator/js/ui/player.js:522–523` |
| Creation of the 400 ms budget | `generator/js/ui/player.js:525` |
| Complete-proof condition | `generator/js/ui/player.js:528` |
| Exception → null | `generator/js/ui/player.js:529–531` |
| Clock sampling every 1,024 checks | `core/js/engine/budget.js:3,12` |
| Live-model non-reentrancy warning | `generator/js/engine/pipeline.js:131–132` |
| `WIRE_VERSION = 1` | `generator/js/engine/pipeline.js:258` |
| Removal-batch flush before a reveal | `generator/js/ui/player.js:324–338` |
| Existing small-/large-board split tests | `generator/tests/suites/player.test.js:336–377` |

`RATE_BUDGET_MS` itself remains correctly cited at `generator/js/ui/player.js:42`.
The behavioral diagnosis survives these citation errors.

### 1.2 Default, “complete moves”, greedy selection and AD2 — accept with scope

**C §4.1 item 3:** I accept the contradictory default language in G1's executive summary, C2/C3 and Decisions.
Q1 now resolves it: **compact by default, complete-move details optional**.

**Item 5:** “Complete moves” was misleading for **G16**, which retained random/sign/multigrid batching and
only combined split exchanges. The correct name is **corrected batched endpoints**.
G2's final Decisions item 5 also continued to mention **16 corrected-batch detail steps**; that is not
the newly chosen “Show every move” view. The example has:

- **32 canonical positions**: the filled solution plus **31 complete changes**;
- **33 displayed details steps**, including the separate final verification;
- **7 compact steps** in the phase-preserving prototype, not a mandatory count for every puzzle.

**Item 4:** The independent `select()` was a **greedy nearest-log-target feasibility probe**, not the
future monotone dynamic program described in the design. Its **536 displayed steps over 104 requests**,
median **5**, range **3–8**, and **3/104** runs within the suggested 8–12 target are confirmed.
I withdraw any implication that the target or the described planner was validated by that prototype.

The peer's **2 avoidable ×3/+100 jumps** in Gm are confirmed, but one interval is misidentified in C §3.6:

| Request | Correction / fresh check |
|---|---|
| Jigsaw Nightmare 42 | The avoidable interval is **35 → 138**, not **138 → 1678**. |
| Same request | **35 → 49 → 138** uses complete recorded positions; ratios **1.4**, **2.8163**. |
| Same request | Between **138** and **1678**, the only inner scores are **1778, 2967**; no monotone bridge exists. |
| Classic Nightmare 1091277992 | **587 → 1579 → 1794** removes the avoidable final flag, as the peer says. |

The shortest *no-badge* witness found by my audit for 35 → 138 is 35 → 39 → 138:
the last gain is only **99**. The 49 checkpoint additionally keeps both ratios below 3.
These are different objectives; the planner must not conflate badge suppression with geometric spacing.
[E\response-audit.json]

**Item 6 / AD2:** I accept that insertion and plateau compaction were not implemented end-to-end in my
independent addendum. Its exhaustive local probes did not constitute a complete segmentation implementation.
The peer's **GA** is explicitly its interpretation: **42 insertions in 19 requests**, **1584** steps,
still **77 decreases**, and **1 avoidable flag under my old ×1.5 rule**.
That demonstrates underspecification, not a tested production algorithm of mine.

The replacement below uses normalized complete changes, a monotone compact projection and a **final interval audit**.
It does not retain my greedy prototype or claim the peer's original geometric selector proves irreducibility.

### 1.3 Missing tables, arithmetic and safety — retain the facts; correct two readings

I accept the peer's verification of the request mapping, formula, example scores, sampling results and
the absence of a demonstrated 400 ms timeout in the reported example.
There is no identified score-arithmetic error in those results.

**Do not change the denominator to make the missing-table problem look smaller.**
A zero-technique paragraph is not a numerical score table:
`generator/js/ui/step-view.js:415–426`.

| Corpus | Numerical tables missing |
|---|---:|
| Example, current replay | **10/21**: 9 null results and 1 free-kind paragraph |
| My original 25 requests | **100/331 = 30.2115%**: 65 null results and 35 free-kind paragraphs |
| Peer original 78 requests | **316/1258 = 25.1192%**: 214 null results and 102 free-kind paragraphs |

Thus C's explanation that its 9 and my 10 count different things is correct; **10** answers the user's
“every step has a table” requirement. C §1's phrase “`reveal` and `final` excluded” is a typo:
**final is reused**, not excluded (`generator/js/ui/player.js:519–521`).

I accept the important coverage extension: the old Classic Hell1 seed **2400651925**, step **35**,
can display **3422** from a Unique Rectangle-containing proof although DFS finds **at least 2 solutions**.
My first sample did not expose that case; G2 independently confirmed it.
The final puzzle is **2879** and unique. This is not permission to change the generator.
It is a reason to normalize split changes and not treat `solved` as unconditional proof of uniqueness.

`SG.difficulty.provesUniqueness` explicitly documents this distinction:
`generator/js/engine/difficulty.js:426–439`.
All **2086 canonical positions** in my 35-request verification were confirmed unique;
that empirical success is not a universal guarantee for every future trace.
[E\cross-focused.json; E\cross-verification.json]

### 1.4 The peer's “?” measurements — verify what can be verified; qualify the rest

**Per-step times, C §1 B1–B3:** I retain them as observations of the earlier run, not portable deadlines.
The example's original page-rater calls totalled **102.890 ms**, versus **99.316 ms** without the time cap.
Neither establishes a browser/frame-time bound. A single logical solve is synchronous:
`core/js/engine/logical-solver.js:246–269`.

**24 single-cell orders, AD3–AD4:** freshly rechecked. All **16 subset boards** of the final exchange are
unique and completely rated. All **24 one-cell orders** are valid, but **0 are nondecreasing**.
The best maximum ratio when decreases are allowed is **2.106498**, on:

```text
568 → 569 → 554 → 1167 → 992
```

The 16-board validation took **30.510 ms** in this run; G1's **32.395 ms** was an earlier observation.
Q2 now forbids turning these probes into replay frames in either view.
[E\response-audit.json]

**336/389 B and 10.290/32.395 ms, AD8:** the two existing annotation objects still serialize to
**336 B** and **389 B**. These are compact annotation JSON objects, not total replay memory.
The old **10.290 ms** first-pair timing is not newly re-benchmarked here.
It remains a quoted earlier measurement, not an SLA.

**Sidecar-size disagreement:** both schemas are valid measurements of different things:

| Example data serialized | Bytes |
|---|---:|
| Peer-style selected compact rating rows | **699** |
| Peer-style G16 selected rating rows | **1728** |
| My prepared compact rating pool plus step references | **3330** |
| Individual jump annotations | **336**, **389** |

The larger pool supports the newly chosen details toggle. These numbers must not be presented as
equivalent schemas or as JavaScript heap usage.
[E\response-audit.json]

**Cache/history/export bytes, C §1 C7:** a fresh before/after analysis check preserves the deterministic
puzzle payload, cache key, serialized cache payload and history's `entryOf` representation exactly.
Raw exports produced at different instants differ in **`generatedAt` only**.
With the same export context, the export is byte-identical.
That timestamp is existing behavior at `generator/js/ui/export.js:142–156`, not an analysis mutation.
I qualify any unqualified “export bytes unchanged” shorthand accordingly.
[E\response-planner.json, `persistence`]

### 1.5 Technique necessity and candidate-choice claims

**Reject the remaining necessity inference in C §3.7.**
“All 80 positive-before jumps got stuck with lighter techniques” does **not** establish that the named
new technique is indispensable even to this solver: a different, heavier technique may finish.
Fresh reruns of the example establish exactly that:

| Ordinary board/rating | Technique excluded | Complete alternative | Alternative score |
|---|---|---|---:|
| Old step 7, **551** | Simple Colouring | 32 Naked Singles, 13 box Hidden Singles, 1 W-Wing | **1113** |
| Old step 20, **992** | XYZ-Wing | 28 Naked Singles, 22 box Hidden Singles, 1 line Hidden Single, 1 W-Wing | **1117** |

These are counterexamples to necessity wording, **not replacements for the canonical ratings**.
The safe common wording is **“the generator's solution uses…”**.
An actually performed lighter-only test may be described narrowly, but is unnecessary to explain the score.
[E\response-audit.json, `ablations`]

**Qualify, rather than invent a counterexample to, C §3.8's candidate claim.**
Its **840 equal numerical chosen objectives, 0 numerical differences, 79 null objectives** are reproducible.
However, checking chosen candidates alone does not establish a claim about **all other candidates**.

I additionally checked **217 numerical `keep` entries**, chosen or otherwise, over six Classic Master requests:
seeds **1, 42, 3275974478, 12345, 20261028, 2400651925**.
All **217 matched**, with **0 guards** and **0 discrepancies**.
The final scores were respectively **1096, 1342, 1153, 1193, 1340, 1206**.
The bounded run took **573.959 ms**, including generation and checking.
This supports the observed agreement; it does not prove equivalence for all requests.
[E\response-objectives.json]

The source still distinguishes a restricted, non-uniqueness-assuming ordinary objective from the canonical
all-techniques, uniqueness-assuming rater:
`generator/js/engine/digger.js:646–697`;
`generator/js/engine/difficulty.js:324–348,442–453`.
Proposal “stuck” objectives are logged as null, not zero:
`generator/js/engine/digger.js:369–372`.

Whether to include the optional candidate-choice sentence remains **U1**.
If included, label it the **generator's check/objective**, bind it to the exact log offset and round,
count unscored alternatives explicitly, and do not call its maximum a proven canonical rating of every alternative.

### 1.6 Disagreement checklist — every item in C §2

| C item | Response after review and 15:30 |
|---|---|
| 1. 16 versus 7 | Accept compact default; correct G16 terminology and true details count to 33 for the example. |
| 2. Milestones versus every move | Resolved by Q1: both views, compact first. |
| 3. Jump rule | Resolved by Q4: **×3/+100**, not my old ×1.5 or the peer's revised ×3.5. |
| 4. Explanation content | Merge changes, proof and formula; reject necessity wording; extras remain U1–U2. |
| 5. Placement | Q5 fixes brief visible text plus disclosure; optional cell/slider marks remain U4–U5. |
| 6. Where/when to rate | Agree: post-result worker; a synchronous solve cannot be subdivided. |
| 7. Setup/position 0 | Agree on numerical zero for filled setup, explicit status for the empty pre-puzzle canvas. |
| 8. Decreases | Q3 rejects the peer's retained 10% compact tolerance; real drops belong to details. |
| 9. Swaps | Agree on complete combined changes; do not claim a transaction tag the log does not contain. |
| 10. Variants | Merge constraint-aware ratings, neutral Killer provenance and existing multigrid cell labels. |
| 11. Persistence/export | Agree on transient data and unchanged identities; fixed-context byte scope above. |
| 12. Tests | Agree on the union of focused quick tests, with no heavy-suite or regression-hash changes. |

The peer's “agreed never split” wording was premature before the answer; **Q2 now actually settles it**.
Similarly, “C4 unchanged”, 10% dips and a ×3.5 badge are not the converged design after 15:30.

## 2. Bounded verification of the revised direction

### 2.1 Recounting the peer's common corpus

I parsed, rather than regenerated, the peer's **104 distinct requests**, **5920 canonical positions** and
**34 structure screens**. All 104 endpoint-givens checks pass. The numerical summaries below are rechecked
from `C\xreview\out-h2h.jsonl`; times retain the scope of the peer's run.

| Historical prototype | Steps/tables | Median steps | Decreases | Positive-before ×3/+100 flags | Avoidable flags |
|---|---:|---:|---:|---:|---:|
| C, old compact tolerance | **761/761** | **7** | **17** | **80** | **0** |
| G16, corrected batches | **1542/1542** | **13** | **77** | **85** | **0** |
| GA, peer's interpretation of AD2 | **1584/1584** | **13** | **77** | **86** | **0** |
| Gm, my greedy prototype | **536/536** | **5** | **0** | **82** | **2** |

At ×3.5, C would have **68**, not 80, positive-before flags.
This is now a historical comparison: the user selected **×3**, even though the illustrative
35 → 100 → 300 → 1000 series triggers its last **2** transitions.

True all-move details with the same accounting would have **6058 screens**:
5920 positions + 34 structure screens + 104 final verifications.
That is why G16's 1542 must not be used as the cost/count of “every move”.
[E\response-audit.json]

### 2.2 Applying the decided policy to the certified 35-request pool

The new pure planner uses the existing **2086** certified positions, complete groups, zero compact tolerance,
the exact Q4 predicate and a post-selection bridge audit. It performs **no new ratings** for this comparison.
The original 35-request corpus is listed in G2 and `E\cross-corpus.json`.

**Phase-end protection is still U3**, so I tested both policies without choosing one:

| Projection | Numerical tables/steps | Steps min/median/max | Decreases | Q4 flags | Avoidable Q4 flags |
|---|---:|---|---:|---:|---:|
| Compact, retain eligible phase ends | **243/243** | **5 / 7 / 10** | **0** | **25** | **0** |
| Compact, allow phase-end merging | **228/228** | **5 / 6 / 10** | **0** | **25** | **0** |
| Every complete move, plus setup/final | **2135/2135** | **22 / 41 / 135** | **74** | **28** | **0** |

Both compact policies have median largest positive ratio **4.729927**; details have **4.937397**.
The maximum is **40.2** in all three, from **50 → 2010** in Classic Hell1 seed **2299986211**.
The complete 35-request comparison, both compact policies plus details and audits, took **64.660 ms**,
excluding ratings. This is a Node research measurement, not a browser latency promise.
[E\response-planner.json]

The saved two-pass rating benchmark used a **1,000,000-check** rating guard and **200,000-check** DFS guard.
Its compact all-move preparation made **1967 fresh ratings per pass**.
The sum of mean per-request rating times was **1264.49 ms**, with maximum mean per request **596.95 ms**
and longest single solve **195.23 ms**. Mean full preparation including verification totalled **1368.54 ms**.
The largest observed non-final work count was **113177**: a **100000** guard fails that case at **100001**.
These facts support worker-first and avoiding a knowingly insufficient initial guard.
[E\cross-common.json; E\cross-focused.json]

The common prepared sidecar's median/maximum serialized sizes were **4797 / 20144 B**.
The largest retained values-buffer total was **197784 B**.
The latter excludes model storage, objects, strings, solver scratch space and worker-transfer overhead.
The peer's “≤20 KB in memory” must therefore be read as a particular serialized-rating size, not total heap.

### 2.3 Controls beyond the measured puzzles

The research planner also checks these **synthetic selector inputs**, not claimed Sudoku instances:

- Overshoot repair inserts **200** into an avoidable **100 → 400** interval.
  Result: **0, 23, 44, 100, 200, 400, 992**.
- If an interval **100 → 1000** cannot become badge-free, **100 → 200 → 1000** still reduces its
  maximum ratio from **10** to **5**. The audit must not stop merely because some jump remains.
- A trace **0, 23, 44, 551, 0 [restart], 23, 44, 600, 992** becomes compact
  **0, 23, 44, 600, 992**, with the abandoned chapter/reset described in text.
  Details retain the actual reset. This strengthens G2's per-chapter proposal to meet Q3's
  **globally nondecreasing compact view**.
- An unknown inner rating between **44** and **551** is not a certificate of irreducibility.
  The table/status and incomplete-audit state must remain explicit.

These are tests of a research planner over prepared data, **not** an implemented browser/worker feature.
The real application and its quick tests remain unchanged.

## 3. Proposed resolutions R1–R14

### R1. Preserve generation and puzzle identity

Do not change the generator, RNG draws, proposal/refinement/search ordering, generation budgets, log format,
rating weights, bands, regression hashes or qualification lists.
All analysis is derived **after** the original result exists.
Do not add replay data to persistent cache/history/export records or change their keys.

The example's deterministic payload digest remains:

```text
d350758d7af16c41f4910469df513f56a7516966407285e1f39d9d983df68f2d
```

### R2. Normalize complete construction changes before selecting screens

Build a generator-owned, DOM-free move model from `digLog`, with stable source offsets, phase, changed cells,
alive constraints, endpoint values and provenance sufficient for honest narration.
`keep`/`reject` are candidate context, not board changes.

Keep symmetry groups intact. Combine adjacent removal/search-reveal records into one complete
**combined change**, before any batching/selection. Do not expose a removal-only half in either view.
Use “swap” as a confirmed transaction only when provenance actually establishes it.
The current log cannot always distinguish one swap from adjacent independent changes:
`generator/js/engine/digger.js:1362–1370,1394–1469`.

“Show every move” means every complete **construction change in this replay**, not every rejected search candidate.
Greater-Than's initial clue construction is a completed opening position, not unsafe one-clue intermediate puzzles.

### R3. Prepare ratings in a post-result worker job

Post the unchanged final result first; the finished puzzle and Summary remain usable immediately.
Then analyze a separate model/snapshot in the worker, never the live model between generation yields.
Current boundaries: `generator/js/worker/gen.worker.js:182–191`;
`generator/js/engine/pipeline.js:131–132`.

Prepare/memoize each distinct values-plus-constraints state once, using the canonical rater.
The module belongs in `generator`, not `core`: it depends on generator replay semantics.
The behavior when no Worker is available remains **U6**; page scheduling is not a guarantee of short individual pauses.

### R4. Use work guards and confirm uniqueness

Propose **1,000,000 checks per rating** and **200,000 per needed DFS confirmation**, independently of generation caps.
A complete proof with `provesUniqueness(rating) === true` needs no redundant production DFS.
Otherwise require a bounded uniqueness result before exposing the score as a valid puzzle rating.
Multiple solutions, an unfinished proof and a guard exhaustion are **different statuses**.

Seed the known final rating before optional analysis.
Never rerate it and overwrite it with null on a guard failure.
Use a model/constraint signature and rating version in transient memoization, not givens alone.
Retries beyond the normal guard remain **U7**, not an automatic unbounded promise.

### R5. Two views, with no decreasing compact score

Q1/Q3 are fixed: compact is the default; details show every complete construction change, including plateaus and drops.
Compact folds overshoots, refinement, neutral search intervals and abandoned restart chapters into step text.
Only the surviving chapter supplies its score checkpoints.
No visible numeric reset to 0 follows a positive compact score.

Details preserve the actual restarts and decreases.
Equal scores still have separately correct counts, cells and constraints.
Changing view maps to a clearly identified corresponding checkpoint/interval.
It must not silently reuse the other view's table.
Approximately **7** is a soft pacing goal, not permission to invent scores or force an exact step count.

### R6. Select geometrically, then audit the finished plan

Use the peer's adaptive spacing idea as a seed:
`R = clamp((max(finalScore, 10) / 10)^(1/6), 1.3, 3)`, with a **10-point** small-gain heuristic.
The floor of 10 is **only an internal selection device**, never a displayed multiplier from zero.
U3 determines whether compatible phase endpoints are protected or may be merged; it is not preselected here.

After all endpoint/plateau/phase processing, audit every Q4 jump over the interval's certified complete moves:

1. Find a chronological, nondecreasing path with no flagged edge; prefer the fewest extra checkpoints,
   then the smaller maximum ratio.
2. If no such path exists, find a path with a smaller maximum ratio and insert its useful checkpoints,
   retaining a genuine jump where necessary.
3. Re-audit inserted edges. Protect the useful first-positive baseline rather than hiding a leap in a
   newly enlarged “first puzzle” step.
4. Do not add single-cell symmetry-group states: **Q2 excludes them from both replay views**.
5. Unknown/capped states prevent a complete-catalogue certificate. State the actual verification scope.

Once an interval is monotone and has a positive baseline, simply merging it with a monotone neighbour cannot
reduce its ratio or point gain. Before normalization/folding, that statement is false:
combining a split exchange is exactly what removes **1849** from the example.

### R7. Keep a score-table container at every state

| State | Required presentation |
|---|---|
| Filled solution; cages/signs displayed over it | Numerical **0**, zero empties and no invented technique uses |
| Rated endpoint, including unchanged score | Its own complete table, not a copy of the preceding score/table |
| Final verification | The exact existing Summary rating, even if it repeats the previous score |
| Pending preparation | Table shell and localized progress/status; no borrowed numerical total |
| Unrated, ambiguous, guarded or unavailable | Explicit distinct status; known facts only, no fabricated score |
| Pre-generation position 0 | “Not a puzzle yet”; no rating and no claim that an empty canvas is difficulty 0 |

A table container is guaranteed; a numerical difficulty for an uncertifiable position is not.
Uncertified intermediate positions are not ordinary compact checkpoints, but remain visible with status in details.
A missing/partial log must still end on the **actual final givens and known final rating**.
Adjacent comparisons refer to the preceding displayed state, not the current backward scan to an older known rating
(`generator/js/ui/player.js:541–551`).

### R8. Apply the user's exact jump rule

```text
jump = before > 0
    and after >= 3 × before
    and after - before >= 100
```

Use canonical rounded totals for both comparisons and the displayed delta.
There is no multiplier at zero. Every newly displayed hardest technique gets a line and textual row indication,
even below this threshold. Actual decreases get direction-aware detail text, not an invented smoothed value.
Hidden intermediate peaks belong in the folded-interval narration/details, not in the endpoint's table.

### R9. Explain the recorded solution and actual formula

Say **“the generator's solution uses…”**, not “the puzzle cannot be solved without…”.
Name the complete changed group/constraints and the new highest-weight technique when relevant.
Partial-board probes may name a locally verified culprit.
They never become a timeline or claim a universally necessary clue.

The disclosure compares **E, P, W, V and R**:

```text
V = 80E/(E+40)
R = 0.25P log2(1+W/P), or 0 when P=0
score = round(V+P+R)
```

Describe the actual directions: W can fall while P, R and the score rise.
The score delta is `roundedAfter - roundedBefore`, not a separately rounded sum of displayed component deltas.
Use the existing apportionment helper for table rows:
`generator/js/engine/difficulty.js:224–272,297–320`.

If per-row deltas are shown, include disappeared techniques or a complete explicit reconciliation.
The example's compact 568 → 992 has **+937** across surviving/new rows and **−513** from disappeared rows,
net **+424**. Omitting the latter while presenting an additive delta column is misleading.
[E\cross-table-deltas.json]

### R10. Show a short visible reason, then “Why?”

Q5 is fixed: put the badge/heading and **2–3 visible sentences** below the step text and above its score table.
Highlight the relevant technique row with a textual label; keep the explanation keyboard/touch accessible.
The disclosure contains P/W/E/V/R comparisons, proof scope and verified subdivision scope.
It must not require hover to discover the reason.

All shown strings go through `SG.i18n.t()` with English and Vietnamese entries.
Optional round-comparison/first-use text and extra visual marks remain **U1–U2/U4–U5**.
Never draw a pattern found later in a logical proof on the initial clue board.

### R11. Respect variant constraints and provenance

- **Killer:** include the actual cages in rating/memo keys; retain a zero structure table.
  A keeper can synthesize a removal log for its chosen cage layout, so use provenance-neutral construction wording,
  not an invented chronology of tested candidates.
  Source: `generator/js/variants/killer.js:784–834`.
- **Greater-Than:** rate each endpoint with its **alive** inequalities, not only the final sparse set.
  Sign removal can change a proof/score without changing E; explain the constraint change.
  The opening is “first rated puzzle”, not a fictitious × ratio or an unsupported “signs do most of the work”.
  Source: `generator/js/variants/greater-than.js:103–121`.
- **Multigrid:** operate on global logical cells, counting overlaps once; Samurai has **369** such cells.
  Use the existing grid-qualified labels, including the first-containing-grid convention for overlaps:
  `core/js/engine/model.js:472–490`.

Clue restoration does not mechanically imply a lower score: the selected proof can change.
Narration must follow the actual direction and distinguish refinement from local-search changes.

### R12. Make analysis lifecycle-safe and transient

Tag progress/results by job identity and puzzle identity; discard stale replies and cancel obsolete work.
Do not delay a new puzzle behind abandoned replay preparation.
Language changes, rendering and table navigation must make **zero solver calls** once data is prepared.

A separate analysis message/sidecar is allowed without changing the existing puzzle-result payload.
Keep cache schema **2**, history **1**, wire **1** and export identities unchanged.
Rebuild analysis after cache replay attaches its regenerated log:
`generator/js/ui/cache.js:203–205,998`;
`generator/js/ui/app.js:858–873`.
No network service or persistent replay data is required.

### R13. Update bilingual documentation and the generator design

At implementation, update `USERGUIDE.md` / `USERGUIDE.vn.md`, `DEVELOPERGUIDE.md` / `DEVELOPERGUIDE.vn.md`,
`generator/design.md` and the relevant help text.
Explain compact/details, real-score discontinuities, folded refinement, whole groups, status tables,
the worker/guard contract and unchanged generation/persistence.
Keep the two languages factually aligned.

A new generator-only analysis script must appear in its `index.html`, `tests.html`,
`tests/node-runner.js` and worker script lists.
Do not move generator semantics into `core` merely to make the worker import convenient.
No guide, help generator or generated `help-examples.js` is changed in this research phase.

### R14. Validate with focused quick suites only

The eventual implementation should cover these behaviors in existing quick suites:

- **`player`, `steps`:** complete exchanges, intact groups, real unchanged tables, both view mappings,
  final reuse, position 0/setup/status states, missing logs, sign-only changes and multigrid identities.
- **Selector cases in `player`/`steps`:** the example, synthetic overshoot, useful partial improvement with
  a remaining jump, restart folding, no compact decreases, unknown audit scope and the chosen U3 behavior.
- **`steps`, `i18n`, `a11y`:** Q4 boundary tests; no zero multiplier; every new hardest line;
  brief callout and accessible disclosure; E/P/W/V/R directions; disappearing rows; both languages.
- **`worker`, `cache`, `pipeline`:** post-done preparation, unchanged result/configuration, cap failures,
  uniqueness-assuming proofs, cancellation, stale replies, cache-hit log attachment and zero solve-on-translate.
- **`history`, `export`:** unchanged entries and fixed-context export bytes.
- **`ui-contract`, `help`:** script lists and guides match the changed behavior.

Retain the ordinary non-search reveal case in `player.test.js:336–352`.
Update only expectations that intentionally exposed a split search combination, such as the large-board case
at `player.test.js:354–377`; do not weaken the unrelated reveal contract.
Use bounded inline/small cases, not heavy seeded generation as a new quick-test dependency.
Do not run/edit manual, soak, performance, qualification, hash-update, deep or browser suites for this change.

## 4. Concrete example and proposed localized text

### 4.1 Which sequence is actually being discussed

Current example (**P** = paragraph, **U** = incomplete rating, **K** = excluded kind):

```text
P, 18, 28, 34, 41, 44, 551, 557, 567, 568,
U, K, U, K, U, K, U, K, 1849, K, 992
```

The representative **phase-preserving** compact plan is:

```text
0, 23, 44, 551, 568, 992, 992
```

If the user chooses phase-end merging under U3, it is instead:

```text
0, 23, 44, 551, 992, 992
```

Both have **one** Q4 jump, **44 → 551**. Neither shows a decrease or a half-exchange.
The chosen details view has **33** screens:

```text
0, 5, 9, 12, 15, 18, 20, 23, 25, 27, 28, 30, 31, 33, 34, 36, 37,
38, 40, 41, 42, 43, 44, 551, 557, 567, 568, 568, 568, 568, 568, 992, 992
```

The final 992 is deliberately the verification screen.
This example has no complete-move decrease, but the common details corpus has **74**.

### 4.2 44 → 551: badge, cause and short callout

The complete group removes **R1C2=3** and **R9C8=1**.
The verified one-cell diagnostic gives **550** for removing R1C2 alone and **44** for R9C8 alone;
both removed give **551**. These are evidence for naming the cause, **not extra replay frames**.

**Heading:** `44 → 551 (+507)`; badge `Score jump ×12.52`.

**Visible EN, three sentences:**

> This group removes the clues at R1C2 and R9C8.
> The generator's solution now uses Simple Colouring twice (weight 360), instead of only Naked Singles (weight 1).
> A diagnostic check identifies R1C2 as the clue behind the large rise; the symmetric group stays one move.

**Visible VI, three sentences:**

> Nhóm này bỏ các số cho sẵn tại R1C2 và R9C8.
> Lời giải của trình tạo đề nay dùng Tô màu đơn giản hai lần (trọng số 360), thay vì chỉ các ô một ứng viên
> (trọng số 1).
> Kiểm tra chẩn đoán xác định R1C2 là số cho sẵn gây ra mức tăng lớn; nhóm đối xứng vẫn là một bước.

Technique names in the implementation use the existing localized keys, not these prose literals:
`generator/js/ui/locale.en.js:285,321,331`;
`generator/js/ui/locale.vi.js:280,316,326`.

**Why? / Vì sao?**

| Term | Before | After | Contribution/change |
|---|---:|---:|---:|
| E | **43** | **45** | +2 empty cells |
| P | **1** | **360** | **+359** |
| W | **43** | **768.25** | Weighted work, not an additive score term |
| V | **41.445783** | **42.352941** | **+0.907158** |
| R | **1.364858** | **148.321617** | **+146.956759** |
| Rounded total | **44** | **551** | **+507** |

The large rise is predominantly the heavier selected proof, not the two extra holes.
The local probes do not prove that Simple Colouring is mathematically indispensable.

### 4.3 568 → 992: a new hardest line, not a Q4 jump

The final complete exchange removes **R4C2=7, R6C8=8** and restores **R1C8=9, R9C2=9**.
Its **+424** rise is only **×1.7465**, so **no “score jump” badge/full callout** under the user's Q4.
It still gets the new-hardest row indication and line:

**EN:**

> The generator's solution now uses XYZ-Wing (weight 750): 568 → 992, with the same 51 empty cells.

**VI:**

> Lời giải của trình tạo đề nay dùng XYZ-Wing (trọng số 750): 568 → 992, vẫn có 51 ô trống.

Its score details remain accessible. Keep the two baselines separate:

| Term | Compact interval before the five exchanges | Details before the last exchange | After |
|---|---:|---:|---:|
| E | **51** | **51** | **51** |
| P | **360** | **360** | **750** |
| W | **906.5** | **906.75** | **806.75** |
| V | **44.835165** | **44.835165** | **44.835165** |
| R | **163.330044** | **163.355672** | **197.545271** |
| Rounded score | **568** | **568** | **992** |

Thus W falls by **99.75** over the compact interval, or **100** over the last single exchange.
P rises by **390**; R rises by **34.215227** or **34.189599**, respectively.
If U3 merges the guided/search boundary, the compact comparison instead starts at **551**;
do not reuse either 568 baseline for that view.
[E\response-planner.json, `exampleTerms`]

### 4.4 Proposed key families

These are proposed keys, not edits to locale files:

| Key | English | Vietnamese |
|---|---|---|
| `steps.view.everyMove` | Show every move | Hiện từng thay đổi |
| `steps.jump.badge` | Score jump ×{ratio} | Điểm tăng vọt ×{ratio} |
| `steps.jump.why` | Why? | Vì sao? |
| `steps.change.firstRated` | First rated puzzle | Đề đầu tiên được chấm điểm |
| `steps.change.newHardest` | New hardest technique | Kỹ thuật khó nhất mới |
| `steps.status.notPuzzle` | Not a puzzle yet | Chưa phải đề Sudoku |
| `steps.change.groupScope` | This symmetric group stays one move. | Nhóm đối xứng này vẫn là một bước. |
| `steps.change.folded` | Intermediate changes are combined here. | Các thay đổi trung gian được gộp vào bước này. |

Sentence templates additionally need localized removed/restored clues, alive constraints, proof-change,
increased/decreased/unchanged terms, pending/unrated/ambiguous/guarded/unavailable states and incomplete-audit scope.
Do not construct Vietnamese sentences by concatenating English fragments.

## 5. Still open for the user

**None of Q1–Q5 is open.** The following additional product choices have not been answered.
No option below is selected by this response.

1. **U1 — Candidate-round sentence:** include in “Why?”, or omit.
   Evidence: 840 chosen numeric matches and 79 null objectives; 217 additional matches.
   If included, use objective-scoped wording and exact log offsets.
2. **U2 — First logical use:** folded text, omit, or a later separate proof-state view.
   This requires collecting a proof witness; never overlay a later pattern on the clue board.
   The ordinary explanation needs no such witness.
3. **U3 — Eligible phase ends:** retain as screens, or allow merging with mixed-phase text.
   Evidence: **243 vs 228** common compact screens; example **7 vs 6**.
   Both policies have 0 drops and the same 25 flags.
4. **U4 — Culprit-cell frame:** add a clearly explained cell mark, or text only.
   Q2 permits diagnosis, not a new board frame; a cell mark must not be confused with a solving pattern.
5. **U5 — Jump markers on the slider:** add, or omit.
   Flags are already prepared; no new solver work. Extra visual density has not been browser/user-tested.
6. **U6 — No Worker available:** automatic guarded page preparation, explicit opt-in with a pause warning,
   or status-only replay. A single observed solve took **195.23 ms in Node**; browser/mobile stalls are unmeasured.
   Final puzzle use must remain available.
7. **U7 — Guard exhaustion:** offer bounded higher-budget retry, or retain the honest status.
   There was no 1,000,000-check failure in the 35-request pool; this is not a universal promise.
   No silent unlimited retry.

The common worker-first/normal-guard architecture is the proposed engineering resolution, not a claim that the
user already selected a fallback or retry UX. Optional explanation extras do not block Q1–Q5's core design.

## Appendix A — Experiments, reproducibility and integrity

### A1. New files outside the repository

Scripts and raw outputs remain outside the repository:

- `E\response-audit.cjs` / `E\response-audit.json`: recount peer 104; repeat technique exclusions and the
  16/24 exchange probe; verify milestone attribution and byte scopes.
- `E\response-objectives.cjs` / `E\response-objectives.json`: six-request Master check,
  217 numerical candidate objectives.
- `E\response-planner.cjs` / `E\response-planner.json`: fixed 15:30 policies, both still-open phase policies,
  details counts, synthetic controls and persistence checks.
- `E\response-preservation.json`: SHA-256 protection for the four frozen reports and eight reused scripts.
- `E\response-verify.cjs` / `E\response-verification.json`: CRLF, link, citation, preservation and git checks.

Additional saved wires are `E\response-classic9-nightmare-1091277992.wire.json` and
`E\response-objective-classic9-master-<seed>.wire.json` for the six seeds listed in §1.5.
Existing `E\cross-*.json`, `E\example.*`, `E\sample.json` and `E\jump-addendum.json` are reused read-only.
The peer's helpers and `C\xreview\` outputs are read-only.

Re-run from PowerShell, with `$E` already set in your shell to the external experiment folder:

```powershell
Set-Location $E
node "$E\response-audit.cjs"
node "$E\response-objectives.cjs"
node "$E\response-planner.cjs"
node "$E\response-verify.cjs"
```

The objective probe is limited to **6 listed seeds**, **1200 rating calls** and a **60000 ms** outer check;
generation has its own **120000 ms** guard. It stopped after the six seeds and **217** calls.
The selector comparison reuses certified pools instead of re-running 35 or 104 generators.
No quick or heavy application suite was run in this research phase.

### A2. Integrity

Phase 3 start, `git --no-pager status --short`:

```text
?? docs/generation-steps/
```

Phase 3 end, the same command:

```text
?? docs/generation-steps/
```

`git --no-pager diff --name-only` and the staged equivalent are empty.
HEAD remains `8d9510aade5d99f4fec9fda3835245a31f411ede`.
The **12 protected files**, including all four frozen reports, remain byte-identical.
This new report is UTF-8 without BOM and uses consistent CRLF.
Only this new report was written in the repository by this phase; no code or prior report was edited.
