# Cross-review of claude-opus-5.5: Generation Steps and explanations of real score jumps

- **Reviewer:** gpt-6-astra.
- **Date:** 2026-10-28.
- **Reviewed:** [claude-opus-5.5's complete independent report](../claude-opus-5.5/1-report.md),
  including C11, its post-13:54 jump-explanation design, and the relevant external scripts/raw outputs.
- **Code:** `tdat00/sudoku`, `8d9510aade5d99f4fec9fda3835245a31f411ede`.
- **Scope:** research, source verification, bounded common-corpus experiments, and this new review only.
  Neither independent report, the peer's scripts, application code, tests, nor git index were changed.
- **Notation:** ✔ = checked against canonical source or rerun/computed here, with the scope stated;
  ✘ = an error or reproducible counterexample; ? = an unverified generalization or unresolved policy.
  `R:line` means `docs/generation-steps/claude-opus-5.5/1-report.md:line`.
  `C\file.js:line` means the peer's external experiment file; `E\file` means my external experiment file.
  Both external directory paths are in the appendix.
- **Latest user decision:** genuine score jumps are acceptable when meaningful grouping/splitting cannot
  remove them, but the UI **must explain why they occur**. This does not settle the numerical jump threshold,
  permitted asymmetric subdivisions, drop tolerance, or worker scheduling.

My [independent report and addendum](1-report.md) remain frozen. Revisions to my position are stated here,
not retroactively applied to that report.

# 0. Verdict in brief

1. **Agree on the main diagnosis and keep the generator unchanged.** The example's missing tables and
   **1849** excursion are replay defects. A real **44 → 551** transition remains after those defects are fixed.
2. **Adopt the peer's compact-milestone direction**, rather than making my 16-step minimal correction the
   only/default view. On a common **35-puzzle corpus**, A's corrected existing batches give **550/550 numerical
   tables**, versus C's compact plan **250/250**. Median steps fall **14 → 7**. The example is correctly
   **7 steps: `0,23,44,551,568,992,992`**, versus my **16**.
3. **Correct two headline accounting errors.** The peer's missing-table total is **316/1,258 (25.12%)**,
   not 214/1,258, when solution/structure paragraphs are counted as the non-tables they are.
   All **78**, not 21, runs have at least one missing numerical table.
   Its full proposed display count is **582**, not 558, when the promised cages/signs steps are included.
4. **The peer found a stronger safety issue than my initial example.** I reproduced a two-or-more-solution
   board that the current UI rates **3422** through Unique Rectangle. A complete logical rating that assumes
   uniqueness is not itself a uniqueness certificate.
5. **Do not accept the universal claim that the selector leaves only unavoidable jumps.**
   On the real common corpus it leaves **zero avoidable ×3/+100 jumps** at recorded complete-move boundaries.
   But its exact code creates **100 → 400** from a supplied trace containing **100 → 200 → 400**.
   A post-selection avoidability audit is necessary before the UI says a jump cannot be subdivided.
6. **Its explanation must not claim a named technique is indispensable.** The reported **551** board also
   solves without Simple Colouring, using W-Wing; the **992** board also solves without XYZ-Wing.
   Say “the generator's logical solution uses…”, not “cannot be solved without…”.
7. **Keep my post-result worker recommendation.** With the same rating policy, preparation costs were
   **319.52 ms total** for selected A endpoints versus **1,264.49 ms** for C's all-move analysis across the corpus.
   C's slowest single solve was **195.23 ms**. A synchronous solve does not become interruptible because
   the outer loop uses small scheduling slices.
8. **Revise my initial 100,000-check guard upward.** A verified intermediate Mega16 position needs
   **113,177 checks** and fails at 100,000. Use **1,000,000** initially, as the peer recommends, with
   explicit pending/capped states and a separately bounded uniqueness check—not a promise that every seed fits.
9. **Prefer nondecreasing compact chapters, with real decreases available in details.**
   Changing only C's tolerance to zero gives **242 steps, zero drops**, versus **250 steps and 8 drops**.
   Fixing its missed phase boundary gives my revised prototype **243 steps, zero drops, 25 positive-score
   ×3/+100 jumps**. The example remains the same seven steps.
10. **Revised UI policy:** a prominent ×3/+100 badge for positive-score transitions, a concise explanation
    for smaller meaningful rises, full `P/W/E` details on demand, and a special first-puzzle explanation
    instead of a fictitious multiplier from zero. Keep final/setup tables, immutable puzzle data, and optional
    complete-move details.

# 1. Section-by-section critical review

Peer-report locators: A1–A5 **R:104–169**; B1 **R:176–213**, B2 **R:215–236**,
B3 **R:238–261**, B4 **R:263–273**, B5 **R:275–299**; C1–C3 **R:304–351**,
C4–C6 **R:353–427**, C7–C10 **R:429–514**; C11.1–C11.3 **R:525–613**,
C11.4–C11.7 **R:615–732**; D1–D5 **R:736–864**; Decisions **R:867–903**.

## 1.1 Part A — Current implementation

### A1. Dig log and result

✔ The dig log, rather than the capped event trace, is the correct source of replay data.
It survives worker transport but is omitted by the persistent cache.
The source supports this reading:

- `generator/js/engine/digger.js:62–72,357–377`.
- `generator/js/engine/pipeline.js:208–244,289–330`.
- `generator/js/ui/cache.js:203–205`.
- `generator/js/ui/app.js:858–873`.

✔ The peer usefully identifies the **synthetic Killer keeper log**.
`logOfClues` constructs a replay by removing empty symmetry groups in group order; it is not a chronology of
the cage-layout search. See `generator/js/variants/killer.js:784–788,814–834`.

? Consequently, “every board shown was a board the generator visited, in its actual order” is too broad
for an application-wide contract. The peer acknowledges this in D5 but still makes the absolute promise
in C1. A safe common contract is **a faithful reconstruction from the chosen log, with provenance-aware
wording**, not fabricated narration that every removal was randomly tried in that exact order.

### A2. Batching and split swaps

✔ Correct. Random batches use roughly a ninth of the board, guided batches scale by `cellCount/81`,
and `reveal` closes the pending removal batch. Local-search swaps are therefore exposed halfway through.
Sources: `generator/js/ui/player.js:44–54,170–190,236–282,322–364`.

✔ The proposed atomic grouping reproduces my independently constructed board/count sequences on all
**26 original cases**. This is stronger agreement than just the same final score.
`E\cross-common.json` records `independentAtomicMatch:true` for every one.

Clarification: my **16-step** example is **not one step per primitive move**.
It retains the existing early random batches and groups each swap into one complete change.
There are **31 primitive changes after the solution**; showing all of them plus solution and final verification
would be **33 display steps**, not 16. The peer's Decision 2 count of 31 omits these two setup/final screens.

### A3. Missing tables and lazy rating

✔ The branch tracing is correct:

- free kinds return an empty count map;
- only ordinary random/guided steps without sign-state data are rated;
- exceptions and incomplete ratings produce cached `null`;
- the final rating comes from the result.

Sources: `generator/js/ui/player.js:499–553`.

✘ The later measurement treats the free-kind paragraph as though it were a numerical **0 table**.
The renderer explicitly returns before constructing a table when the technique bars are empty:
`generator/js/ui/step-view.js:415–426`.
This causes both the undercount of missing tables and the invented “currently shown 0 → final score” ratios.
The exact corrections are in §2.

### A4. Generation phases

✔ The phase inventory and complete-swap acceptance rule are substantially correct.
The local candidate is fully assembled before uniqueness/rating, and a kept candidate must be solved,
nondecreasing, and below the requested maximum:
`generator/js/engine/digger.js:1394–1469`.

✘ “Downward refinement: the score goes down” is not an invariant.
The implementation accepts a complete rating **at least the band's minimum**, not necessarily below the
previous score. My measured Killer sequence **2997 → 2780 → 2788 → 1940** contains an increase during
restoration. Source: `generator/js/engine/digger.js:1092–1143`.

? Random Stage A is **often** singles-only on the classic examples, not necessarily every variant or seed.
Killer can already use cage techniques there. Keep “mostly”/“in this example,” rather than making
singles-only Stage A a prerequisite of the explanation.

### A5. Formula and bands

✔ The score formula, fixed bands, current Expert **[700,1000)**, and listed weights agree with the code.
Sources: `generator/js/engine/difficulty.js:5–23,70–114,233–272`.

Precision needed in the phrase “one use adds at least `1.25w`”:

- A complete rating **containing** a technique of weight `w` has a total at least `1.25w`.
- Adding that technique to an already harder proof does **not** necessarily add `1.25w` to its score.
  If another technique already sets `P`, it only changes `W` and the logarithmic work term.

This distinction matters to the UI's wording “points per use”: `weight × uses` is **work W**, not the
row's additive difficulty contribution.

## 1.2 Part B — Diagnosis and prevalence

### B1. The reported seed

✔ Independently reproduced. The **21 original steps**, final **992**, **30 clues**, missing steps
**11–18**, and raw step **19 = 1849** agree exactly.
My report's detailed changed-cell list and its unbounded ratings agree with the peer.

✔ The user-facing text “Rate 0 possible removals” on a search half is also misleading.
A search exchange needs its own narration, not the guided-candidate template.

✘ The example has **10 numerical tables missing**, not 9:
the peer's nine `null` stats positions **plus the full-solution paragraph**.
The displayed sequence printed in its own executive summary already contains those ten non-table entries.

### B2. Missing causes and the stronger ambiguity artifact

✔ The four main mechanisms are correct. A 400 ms limit did not cause the reported missing block.
Changing only the timeout would not fix excluded reveals or invalid half-swaps.

✔ **Important addition adopted:** Classic9 Hell 1 seed **2400651925**, old step **35**:

```text
kind: guided
UI score: 3422
rating.solved: true
uniqueRectangle uses: 1
forcingChain uses: 15
nishio uses: 3
countSolutions(..., 2): 2
final puzzle score: 2879
```

I re-generated this request, called the actual `player.rateStep(35)`, independently rated its values,
and counted solutions. Removing Unique Rectangle from the allowed technique set makes the solver **stuck**.
Evidence: `E\cross-focused.json`, `artifact`.

The solution count of **2** is a capped count: it means **at least two**, not a proof that exactly two exist.
This is a display artifact; the final puzzle independently remains unique.

The source explains the hazard:
`rate` assumes uniqueness, while `provesUniqueness` explicitly excludes proofs using a technique that
assumes it. See `generator/js/engine/difficulty.js:435–460`.
A score-table policy must use an appropriate uniqueness guarantee, not just `rating.solved`.

### B3. Where jumps occur

✔ On the common example, one accepted pair changes **44 → 551**.
The best local individual-cell subdivision is **44 → 550 → 551**; it does not remove a large increase.
The source intentionally chooses the highest considered objective:
`generator/js/engine/digger.js:719–790`.

✔ The log's comparison with the other nine acceptable candidates scoring **45** is useful explanatory
context for this particular round.

? The statement about **47/52** hard-or-higher cell runs' largest rise being the first guided round is a
peer-sample frequency, not an engine invariant. I did not regenerate all 78 requests just to repeat that
frequency calculation. My independent/common samples support the mechanism, not a population-wide percentage.

? Scores in `keep` entries are the **generation objective**, not always an unrestricted puzzle rating.
This is a crucial qualification when adopting the “other choices would have scored…” sentence.
The proposal objective can deliberately be stuck and logged as `score:null`.
Sources: `generator/js/engine/digger.js:357–371,646–697`.
The numeric `keep` values match the example, but the general UI must identify their provenance or rerate
the alternative boards before calling them full difficulty scores.

### B4. Monotonicity, uniqueness, and logical completion

✔ Nonmonotonicity is real; both reports and the code agree.

✘ “Every real position is unique and completely rated” is not established by the oracle argument.
DFS uniqueness proves uniqueness, not completion by the finite logical technique portfolio.
Both proposal digging and Greater-Than's minimal-sign pass can use uniqueness alone:

- `generator/js/engine/digger.js:654–673`.
- `generator/js/variants/greater-than.js:291–300,379–410`.
- A merely stuck logical solve is a normal result: `core/js/engine/logical-solver.js:246–269`.

The correct statement is:

> Every position measured in that prototype sample had a complete rating; this is not a guarantee for every
> possible accepted position or every future work guard.

✔ The wider sample's ambiguous-but-rated example is a valuable reason to retain the proposed independent
uniqueness confirmation when the proof assumes uniqueness.

### B5. Prevalence table

✘ The “without table” statistic excludes every free-kind paragraph.
The script's `noTable` filter is `s.page === null`, while `page:'free'` means exactly that the renderer
showed a sentence instead of a table. It also converts `'free'` to numerical zero when constructing the
“shown” sequence.
Source: `C\sample.js:60,96–102`.

Corrected arithmetic from the same raw corpus:

| Variant | Display steps | Null stats | Zero-technique paragraphs | Missing numerical tables |
|---|---:|---:|---:|---:|
| classic9 | 474 | 76 | 30 | 106 |
| jigsaw9 | 159 | 1 | 12 | 13 |
| samurai | 155 | 4 | 12 | 16 |
| killer | 302 | 1 | 24 | 25 |
| greaterThan | 168 | 132 | 24 | 156 |
| **Total** | **1258** | **214** | **102** | **316** |

- Correct missing fraction: **25.1192%**, not 17%.
- Runs with at least one missing numerical table: **78/78**, not 21/78.
- Greater-Than has **12 numerical tables across 12 runs**, one final table in each.
  Therefore its alleged currently *shown* huge 0-to-final ratios are not transitions between numerical tables.
- The example is **10/21 missing**, not 9/21.

These are denominator/measurement corrections; they strengthen, rather than weaken, the need for the redesign.
Evidence: `E\cross-audit.json`, `source.sample`.

Also, the script's “full” comparison uses a default **20,000 ms** guard, not literally an unlimited budget
(`C\sample.js:16,64–65`). No observed timeout reached that cap, so it does not explain the numerical differences.

## 1.3 Part C — Proposed replay

### C1. Principles

✔ Preserve the generator, final puzzle, rating formula, dig log, cache keys, history identity, and exports.
All **35 common requests** used identical normalized request keys through both researchers' configuration
helpers; all final puzzle payload hashes were preserved.

? Retaining true order should be qualified as **the reconstructed log order**, especially for synthetic
Killer logs. The user has accepted genuine jumps, not arbitrary invented histories.

? A “no drop over 10%” rule is an unresolved presentation choice, not a consequence of the user's decision.
I test it against a zero-drop policy in §4.

### C2. Move-level reconstruction

✔ This is the peer's most useful contribution. The concrete move parser gives a practical source for
score-aware selection and a clean separation between accepted changes and display steps.
Its first **26** reconstructed score/count/board sequences matched my independent parser exactly.

✔ Adopt net board marks for an aggregated search step, with **gross** operation counts in its text.
The five exchanges in the reported seed should not be described as five hardest-removal rounds.

? An adjacent `accept`/search-`reveal` pair has no explicit transaction ID.
Conservatively grouping it is a safe complete display interval, but not every possible adjacent pair should
be asserted to be exactly one original search transaction without provenance.
The reported example is clear: its first four removal halves are ambiguous, and its fifth is above the
Expert maximum, so those halves cannot have been accepted independent search moves.

Prototype gaps to close:

- A missing log yields only the full solution in `movesOf`; it does not end at the actual puzzle.
  I reproduced **1 move, `endsOnPuzzle:false`** with the reported result and `digLog:undefined`.
- Missing/partial logs must retain the current fallback: solution/structure when available, then the actual
  final puzzle. The current builder explicitly installs `result.givens` at the end:
  `generator/js/ui/player.js:75–87,132–166`.
- A `restart` needs a new selection chapter; a single global suffix minimum of zero otherwise erases
  all positive pre-restart positions. See the reproduced case below.

These are prototype limitations, not bugs introduced into repository code; no implementation has been made.

### C3. Rating location, work guard, and final reuse

✔ Adopt a deterministic work guard, actual sign models, known-final reuse, and uniqueness verification when
the logical proof assumes uniqueness.

**My correction:** my initial **100,000-check** default is too small for the expanded common corpus.
Mega16 Hell 2 seed **12**, atomic index **76**, needed **113,177 checks** and threw `budget.exceeded`
at **100,001** with the smaller guard. It is an intermediate position, not merely the already-rated final.
My proposed retry could recover it, but the smaller first pass would waste work.
I now recommend **1,000,000** as the initial per-rating guard.

✘ The supplied prototype does not implement two of its stated optimizations:

- `C\moves.js:108` defaults to **2,000,000**, not 1,000,000.
- `C\moves.js:114–139` rerates the final move. The `k !== last` condition only skips its extra DFS check.
  In a direct call on Greater-Than Expert seed **42**, **112 move entries** produced **111 rating calls**.
  Reusing the final would reduce that to **110**.

The head-to-head below deliberately implements the **stated proposal** with a common 1,000,000-check
adapter and final reuse, rather than charging C for this avoidable prototype discrepancy.

✘ A guard failure at the final move is currently promoted into a mandatory endpoint:

```text
M.rateMoves(example, {nodes:1}): 31 guarded ratings
stored final result score: 992
prototype final move score: null
M.segment output scores: 0, null
```

The final result must always use its known **992** rating.
Source: `C\moves.js:106–139,149–165`.

? A fixed guard does not prove that no future position can exceed it. Incomplete/capped positions need
explicit status, retry/fallback behavior, and must not be used as evidence of an irreducible score gap.
The extra DFS confirmation also needs a guard; the prototype currently passes no budget to it.

✘ “In a few-ms slice, so the page stays responsive” is not generally true.
A rating is synchronous and non-resumable:
`generator/js/engine/digger.js:1562–1569`;
`core/js/engine/logical-solver.js:246–269`.
The common experiment measured a single C rating lasting **195.23 ms**, even after reusing the final.

**Keep my worker recommendation:** show the unchanged puzzle first, then analyze replay in an independent
post-result job. The peer's alternative “worker before sending the result” is not the only worker design.
`generator/js/worker/gen.worker.js:182–191` already defines the immediate `done` boundary.
Do not analyze the live model between generation yields:
`generator/js/engine/pipeline.js:124–133`.

### C4. Score selection

✔ The adaptive ratio and phase-aware compacting are a useful replacement for cell-count-only display batches.
They dramatically reduce the long local-search plateau without changing any board the generator returns.

✘ The claimed impossibility of further useful splitting does **not** follow from the algorithm.
Rule 3 cuts at the first state **at or above** the target ratio; it can overshoot that ratio.

I ran the exact exported selector on this synthetic, already-rated input:

```text
Input:
0, 23, 44, 100, 200, 400, 800, 992
phases: start; random, random; guided thereafter

C selector:
0, 23, 44, 100, 400, 992
```

It creates a **100 → 400** rise, **×4 and +300**, although the supplied **100 → 200 → 400** path has
only ×2 rises. This is a counterexample to the **selector guarantee**, not a claim that I generated a
Sudoku with exactly this synthetic sequence.
Evidence: `E\cross-focused.json`, `avoidablePrototype`.

The real 35-case corpus has **zero such avoidable ×3/+100 jumps** under the tested definition.
That observation is valuable but cannot replace the missing algorithmic guarantee.
Fix: audit each flagged output interval against its rated complete-move states and insert a valid
no-jump path when one exists. My revised prototype verifies that repair in §4.

✘ Phase-end selection does not always choose “the last eligible position of every phase.”
The test uses the **next raw move**, not the next eligible boundary:
`C\moves.js:174–177`.
On Greater-Than Expert seed **42**, the last eligible position of a signs phase is atomic index **35**,
score **135**, but it is not selected. A smaller synthetic reproducer gives:

```text
Raw scores:       0, 23, 24, 200, 25, 80
Raw phases:   start, random ×3, guided ×2
Output:           0, 23,         25, 80
```

The random phase's last eligible **24** is omitted.
Select the last eligible index of each contiguous phase, not only an eligible raw phase endpoint.

✘ Restart handling is not implemented as described. For:

```text
0,23,44,551, 0(restart),23,44,600,992
```

the current selector returns:

```text
0,0,23,44,600,992
```

because the later zero makes the earlier positive positions ineligible.
Select each restart-delimited chapter separately.

Precision: `score <= suffixMin × 1.1` permits at most **9.0909%** drop relative to the preceding score,
not exactly 10%. It also constrains a position against **every later minimum**, not just the next step.
This is a stronger policy than “each adjacent dip may be 10%.”

### C5. Presentation

✔ Adopt:

- a true current score and Total change;
- new-technique explanation below the large-jump threshold;
- a separate search/combined-change title;
- net cell marks and gross move counts;
- an explicit peak/tuning sentence for an interval whose excursions are folded.

? Per-row score deltas need additional accounting. If only currently present technique rows are shown,
their deltas need not sum to the Total delta because old techniques disappear.
For C's **568 → 992** example:

| Row | Before | After | Change |
|---|---:|---:|---:|
| Naked Single | 5 | 7 | +2 |
| Hidden Single, box | 5 | 6 | +1 |
| Hidden Single, line | 0 | 0 | 0 |
| XYZ-Wing | 0 | 934 | +934 |
| Empty cells | 45 | 45 | 0 |
| Pointing, no longer in current table | 14 | 0 | −14 |
| Box/Line, no longer in current table | 9 | 0 | −9 |
| Simple Colouring, no longer in current table | 490 | 0 | −490 |
| **Total** | **568** | **992** | **+424** |

Deltas beside only the currently visible rows sum to **+937**, with **−513** omitted.
This is not an error in the actual current totals; it is a risk in the proposed new comparison UI.
Prefer Total delta plus an explicit comparison disclosure, or include the union of before/after rows with
zero-current-use rows clearly labeled.
Evidence: `E\cross-table-deltas.json`.

? “Peak exceeded this level, so clues were restored” should only be used when the interval really contains
restoration and exceeds the requested band. A proof can change after sign/cell removal without restoration.
The explanation must be selected from actual operations, not just `peak > endpoint`.

### C6. The seven-step example

✔ Reproduced exactly, including the separately appended final verification:

```text
0, 23, 44, 551, 568, 992, 992
```

The early **23** is a real 14-empty-cell checkpoint in the recorded random removal sequence.
The five search swaps are safely represented as one interval in the compact view.

I adopt this as the proposed **default compact view**, not as a claim that there are only seven actual
generation operations. My original **16-step** correction remains useful as a more detailed view.

### C7. Sample comparison

✔ Raw totals agree that **4,483 move entries** were analyzed across 78 requests, with no reported
unrated entry in that prototype sample. Six selected peer sample requests were re-generated here;
their final scores matched.

✘ The aggregate **558 display steps** omits the promised structure steps.
`C\summarise-compare.js:23` adds one final step to each bare checkpoint list, but `movesOf` does not
include a cages/signs screen.

From the unchanged raw records:

```text
480 selected move checkpoints, already including solutions
+ 78 final verification screens
+ 24 cages/signs screens
= 582 actual proposed display steps
```

The corrected range is **5–10**, median **7**, for that particular 78-case sample.
The common 35-case sample reaches **11**; therefore an adaptive policy should not promise a fixed maximum
of ten screens.

? “Largest rise is the smallest possible in 66/78” is conditional on the eligible-state filter and its
ratio convention. It is not a proof about all valid asymmetric subdivisions, other replay semantics, or
all future inputs. The synthetic overshoot counterexample shows why an output audit is still needed.

### C8. Alternatives

✔ Agree that re-scoring only the display, altering generation, or inventing a smooth score would violate
the intended contract. The local superset gap and limited value of a separate illustrative ladder are
supported by both studies.

✘ The example's supersets are not all “≤45 or ≥900.”
The peer's raw bins are **below 50**, not ≤45, and my exhaustive one-group probe contains **46 and 47**.
Its detailed C8 table uses the correct “Below 50” heading.
The sampled absence of **50–899** still supports the main conclusion.

? Those **2,151 sampled/exhaustive-small-order supersets** do not prove that every possible reordering
or multi-group subset has no middle score. Preserve the sampling scope.

### C9. Cost, storage, and protocol

✔ No replay data needs to be persisted or exported, and puzzle/cache/history identities need not change.
Cache schema **2**, history **1**, and existing exporter behavior can remain unchanged:
`generator/js/ui/cache.js:42,203–205`;
`generator/js/ui/history.js:19–22`;
`generator/js/ui/export.js:127–198`.

? “Nothing is sent / worker protocol unchanged” is an implementation choice of the UI-only proposal, not
a requirement for preserving puzzle identity. A separate post-result analysis message can leave the
existing puzzle result and all persistent formats unchanged.

✘ The table's all-in **≤3.7 ms per jump** wording is too strong: its C11.7 text identifies **3.7 ms**
as partial-rating time and separately measures the first-use solve. Neither is a browser responsiveness
bound. The common-cost table below includes only clearly defined preparation work.

### C10. Implementation outline

✔ Pure move reconstruction, rating, segmentation, and rendering are sensible separations.
Keep that design whether the analysis runs in the UI or a worker.

? A reusable pure analysis module should be generator-owned, not shared `core` merely for convenience.
Moving it into a worker requires the generator script lists and client/protocol work; that is worthwhile
for responsiveness, but must be described rather than claiming the worker remains untouched.

Fix the demonstrated phase, restart, missing-log, final-reuse, and cap-path prototype gaps before copying
the code into the application.

## 1.4 C11 — Explaining the remaining jumps

### C11.1. Unavoidability

✔ Its local analysis of the reported pair is correct: one cell gives **550**, the other **44**.
The useful statement is “a large increase remains under this subdivision,” not “no intermediate board exists.”

✘ “No board in between is easier” is literally false: **550 is less than 551**.
The decrease in the largest jump is merely negligible, **507 → 506 points**, not a useful smoother path.

✘ “Grouping never helps” needs a monotone, already-normalized interval qualification.
Grouping the two halves of a swap is exactly what removes **1849** from the example.
Grouping a genuine overshoot/refinement interval can also make its displayed endpoint rise smaller.

✘ The proof that C4 has exhausted splitting is invalid because the geometric fill can overshoot.
The **100 → 400** selector counterexample above is decisive.

✔ The peer itself supplies real partial-board exceptions; I independently rerated and verified uniqueness:

| Request | Whole move | Verified single-cell intermediate | Smaller ratios |
|---|---|---|---|
| Jigsaw Nightmare 3962167687 | 46 → 252 | Remove R1C4 alone: 136 | 2.9565 and 1.8529 |
| Killer Expert 3514204290 | 168 → 533 | Remove R7C4 alone: 340 | 2.0238 and 1.5676 |

Both lose the peer's ×3 flag if such asymmetric internal frames are allowed.
Therefore “unavoidable” is conditional on the **whole-symmetry-group display policy**, which the user has
not yet explicitly selected. Keep the normal replay whole-group by default, but state that scope honestly.
If the user allows verified within-group frames, these are cases that should actually be split.

### C11.2. Jump rule

✔ The **74** flagged records and their **61-run** distribution are reproducible from the peer's raw jump file.
The peer's two-tier idea—large badge plus smaller-rise explanation—is preferable to making every meaningful
rise look like a warning.

? Neither **×3/+100** nor my earlier **×1.5/+100** is a user-approved threshold.
The user's geometric example motivates ×3, but does not experimentally calibrate a UI severity boundary.

✘ A badge such as **“×13.4” for 0 → 134** is not a true multiplier.
It is the internal regularization `max(score,10)`, not arithmetic the player can apply to the shown score.
**10 of the peer's 74 flags start at zero**.
Use a “first puzzle / initial clues and constraints” explanation, without a multiplication badge.

My revised policy is:

- prominent badge at **positive-to-positive ×3 and +100**;
- concise causal text for smaller meaningful rises, including **568 → 992**;
- accessible `P/W/E` comparison on both, not only the large badge;
- first-positive score gets setup narration, not an artificial ratio.

Under the common corpus's two different definitions, the counts differ substantially; §3 keeps them separate.

### C11.3. Content and mathematical claims

✔ The proposed ordering—what changed, what proof changed, then the formula—is useful.
The candidate-choice context, when correctly attributed, helps explain why guided generation took a leap.

✘ **“The puzzle cannot be finished without [named technique]” is too strong even for the reported seed.**
I reran the solver while excluding the named technique:

| Board | Excluded technique | Alternative complete proof | Alternative classification |
|---|---|---|---:|
| Old step 7, ordinary rating 551 | Simple Colouring | 32 Naked Singles, 13 box Hidden Singles, 1 W-Wing | 1113 |
| Old step 20/final, ordinary rating 992 | XYZ-Wing | 28 Naked Singles, 22 box Hidden Singles, 1 line Hidden Single, 1 W-Wing | 1117 |

These alternatives do **not** replace the canonical ratings. They disprove the wording that the named
technique is indispensable.
The correct explanation is about the fixed solver's selected proof.
Evidence: `E\cross-audit.json`, `ablations`.

? “The work W grows … so R grows” is not a safe generic template.
For the complete final swap, `P` rises while `W` falls. Both `P` and `W` enter `R`.
No such decrease appeared among the peer's 74 strict flags or our common strict flags, so this is not
an accusation that those particular 74 recorded lines have wrong numbers.
It is a necessary correction when the same comparison UI explains the smaller **568 → 992** rise.

There are also two legitimate baselines for that comparison:

- C's aggregated five-swap interval starts at old step **10**:
  `W = 906.5 → 806.75`, decrease **99.75**.
- A's final single swap starts at old step **18**:
  `W = 906.75 → 806.75`, decrease **100**.

Both start with displayed score **568**. Do not mix the counts of one with the description of the other.

? Candidate-choice text needs source scope:

- Ordinary `keep` entries are restricted-oracle objectives; proposal entries can have `score:null`.
- `C\jump-explain.js:102–114` finds the **last accept with matching cells**, not the accept at this
  specific move's log offset. A future repeated group can make that lookup refer to a different round.
- I found **four** guided jump records with a null chosen objective in the peer's data.
  This is compatible with proposal digging, not a missing full rating to convert to zero.

Record source log offsets in the move model. Say “the generator's objective” unless the alternatives have
been rerated with the canonical rater.

### C11.4. Placement

✔ Agree on a visible reason below the step text, a highlighted technique row with a text label, and
before/after details accessible from the table.

? Prefer a neutral information treatment over a warning-color message for an intentional, valid increase.
Use existing tokens, text/borders as well as color, and keyboard-accessible disclosure.

? The proposed nine-sentence callout is too large as the default phone view without user testing.
I recommend two concise causal sentences and a disclosure for the full formula, other candidates,
subdivision evidence, and first-use text.

✔ Folded first-use prose is a reasonable optional detail.
? Highlighting that proof's cells on the original clue-only board is not automatically sound:
the pattern exists after earlier logical deductions. A “show proof on board” option must reconstruct
that logical state, not just overlay a late proof pattern on the initial board.

### C11.5. Example

✔ The **44 → 551** term arithmetic is correct:
`P +359`, `R +146.9568`, `V +0.9072`, rounded-total change **+507**.
The first Simple Colouring witness matches my addendum.

✘ Replace:

```text
cannot be finished without Simple Colouring
no board in between is easier
```

with:

```text
The generator's logical solution now uses Simple Colouring.
Removing R1C2 alone already scores 550, so subdividing this pair still leaves a large increase.
```

✔ The **568 → 992** rise should retain an explanation even though it is below ×3.
I keep a compact peak/empties sentence and put its counterintuitive falling `W` in the expanded comparison.

### C11.6. Variants

✔ Correct active sign models are essential, and the peer's helper uses them.
Current rendering keeps a full sign model and uses marks to hide/decorate removed signs; rating must
construct the actual alive-sign model, not reuse every visually stored inequality.
Sources: `generator/js/variants/greater-than.js:103–121`;
`generator/js/ui/player.js:580–620`.

✔ Killer explanation should name the relevant cage technique and cage context when available.
✔ Multigrid labels should use the existing global-ID/subgrid labeler, not count an overlap twice or
sum five independently rated Samurai boards.

? Do not assert “the signs do most of the work” merely because the step is a Greater-Than opening.
Explain the actual proof/constraint change. Sign constraints matter even when the counted proof's
hardest technique is a conventional pair or fish, but the counts alone do not quantify their causal share.

### C11.7. Cost

✔ Reusing count maps and breakdowns requires no extra solve for ordinary explanatory text.
Small partial-board probes and one optional `collectSteps` solve are feasible as separately bounded work.

? Keep partial-probe timing separate from witness-solve timing and rendering.
If a probe fails, the UI must not show `smallest`/`splitChecked` as though unavoidability had been proved.

? The swap diagnostic in `C\jump-explain.js:49–88` tries only **add-all-first** and **remove-all-first**,
not all subsets or orders of a four-cell swap. My addendum enumerates **16 subsets** and all grouped
monotone paths for the example. Label the scope of each diagnostic rather than presenting both as exhaustive.

## 1.5 Part D and the peer's Decisions section

### D1–D2. Visible changes and strings

✔ The broad user-facing plan is sound: fewer steps, stable tables, clear swaps, real score deltas, and
an explanation of genuine technique thresholds.

✘ Revise the absolute necessity, “work grows,” and “no intermediate is easier” wording as above.
Do not infer the direction of a score change from whether clues were added or removed.

? Detailed score-row deltas, warning styling, first-use overlays, and slider markers are separate UX choices.
They should not delay the core correctness fix.

### D3. Documentation

✔ The guides in both languages, generator design, Help narrative, and script lists if applicable are the
right surfaces. The stale “click the list of steps” instruction is a useful finding.

? Do not publish fixed new example step counts before the final selector policy is chosen and tested.
The prototype has setup-accounting and edge-case gaps; those affect the documentation contract.

### D4. Tests

✔ Replace old batching-specific expectations only when the new display contract is implemented.
Keep final-board, counters, actual ratings, and deterministic-source invariants.

Add the missing focused cases:

- the ambiguous-but-`solved:true` **3422** board;
- missing log/solution fallback and known final rating under a guard failure;
- restart-delimited selection;
- last eligible phase boundary;
- the synthetic **100 → 400** overshoot;
- disappeared-technique delta accounting;
- proof-scope language and the zero-score multiplier exception.

If `core/css/board.css` is changed for a cause mark, the repository instructions require both apps'
quick suites for a shared-core change. Prefer keeping generator-specific presentation in generator CSS
where practical. No heavy suite or regression-hash update is needed.

### D5. Risks

✔ The risks listed are relevant.
✘ Main-thread responsiveness is not guaranteed by per-move slicing.
? Synthetic Killer provenance is not safely “out of scope” if the new copy explicitly claims an actual
random choice or a recorded candidate comparison. Use neutral reconstruction language when provenance
is unavailable.

The peer's fourteen product decisions are merged, with the resolved items clearly separated, at the end.

# 2. What the apparent report disagreements really mean

## 2.1 16 versus 7 steps is a granularity decision, not a different puzzle

The same **32 canonical positions**—solution plus 31 changes—underlie both example plans:

```text
A, corrected existing batches:
0,18,28,34,41,44,551,557,567,568,568,568,568,568,992,992

C, compact milestones:
0,23,44,551,568,992,992
```

Both remove the invalid half-swaps and preserve the true **12.5227×** jump.
C also compresses the early easy removals and the four neutral search swaps.
That is a real usability improvement, not evidence that the generator itself became smoother.

## 2.2 The jump thresholds answer different UI questions

- **A rule:** before positive, gain at least 100, ratio at least 1.5.
- **C rule:** gain at least 100, `max(after,10)/max(before,10)` at least 3.

On the common A plan these flag **41 versus 33** transitions.
On the common C plan they flag **40 versus 30**.
Five C-rule flags in each plan start at zero; excluding them gives **28 and 25 true-positive-score
large-jump flags**, respectively.

Do not compare the two flag counts as though they use the same definition.
My revised two-tier presentation adopts the peer's quieter large-badge threshold while keeping
mandatory causal information for meaningful smaller changes.

## 2.3 Some count/timing differences are accounting or prototype choices

- Paragraphs versus numerical tables: **214 nulls + 102 paragraphs = 316 missing tables**.
- Bare checkpoints versus full screens: **480 + 78 finals + 24 structure screens = 582**.
- The peer's default executable rating guard is **2,000,000**, its prose recommends **1,000,000**.
- Its executable rerates the final; its intended design reuses it.
- Our first samples were different, so **25.12%** on its corpus and **30.21%** on my 25-case sample are
  not contradictory frequencies once their definitions are aligned.
- Timing on a shared Node machine is not a phone frame-time guarantee.

# 3. Bounded common-corpus head-to-head

## 3.1 Corpus and fair comparison

The common corpus has **35 requests**:

1. My reported seed plus the **25** independent sample cases, using their saved immutable wire results.
2. Nine peer-selected cases generated here:
   - Classic9 Hell 1: **2400651925**, **2299986211**;
   - Greater-Than Hard: **3115968914**, **3099191295**;
   - Jigsaw Nightmare: **3962167687**;
   - Killer Expert: **3514204290**;
   - Mega16 Hell 2: **12**;
   - Samurai Hell 2: **13**;
   - Killer Hell 2: **16**.

The nine new generations totaled **14,983.481 ms**. Each retained the ordinary **120 s** generation guard.
These are standalone bounded requests, not executions of any forbidden heavy test script.

For each fixed result:

- **A** is my minimal correction: existing display batches, adjacent search halves grouped, every complete
  endpoint rated. It is not “one screen per raw cell/move.”
- **C** imports the peer's unchanged `movesOf` and `segment`, with its default 0.1 tolerance.
  I explicitly add the promised structure and final-verification screens.
- Both use the same **1,000,000-check** rating adapter, **200,000-check** uniqueness guard, memoization of
  identical board/constraint states, zero/full-grid ratings, and known final reuse.
- A prepares only the selected endpoints; C prepares every complete-move position.
  If A also prepares every position for later milestone selection, it pays C's preparation workload.
- Actual rating time is the mean of **two warmed preparations per plan**, with plan order alternated.
  Generation and the independent evidence pass are excluded.
- Per-state model construction and extra DFS checks are included in a separate total preparation time.
- No DOM rendering or browser Worker transport is simulated.

All **35 request keys** match between the researchers' UI configuration helpers.
All **35 final puzzles** independently pass DFS uniqueness, and all **35 model/givens/solution/rating/config/
log/warning/seed/attempt digests** remain unchanged; timings are excluded from this identity digest.

There are **2,086 canonical entries**, with **50** exact state cache hits.
The evidence pass made **2,002 nonfinal DFS checks**, and the final pass checked all **35** final puzzles.
All eligible entries have complete ratings; no 1,000,000-check rating guard fired.

## 3.2 Metric definitions

- **Table:** numerical zero/complete-proof table. A future pending/unrated table shell is not counted as a
  numeric score. These are prototype output contracts, not claims that the unchanged UI already renders them.
- **Largest ratio:** maximum `after/before` between adjacent **positive** scores. Zero-to-positive is excluded.
  C's floored ratio is separately retained in the raw data.
- **Flags A/C:** apply each rule to **each plan**, a two-by-two comparison.
- **Avoidable flag:** within that output interval there exists a chronological, nondecreasing path through
  verified complete-move states such that **none** of its edges triggers the same rule.
  This does not permit new asymmetric counterfactual boards.
- **Drops:** actual displayed negative score changes.
- **Sidecar:** compact UTF-8 JSON with a common schema of prepared rating records and selected step references.
  It excludes board arrays, source log, JS heap overhead, and jump-witness proofs. Neither design persists it.
- **Value buffers:** retained `Int32Array` snapshot bytes only.

## 3.3 Aggregate results

| Metric | A: corrected batches | C: compact milestones |
|---|---:|---:|
| Numeric tables / steps | **550/550** | **250/250** |
| Steps: min / median / max | 4 / 14 / 60 | 5 / 7 / 11 |
| Median largest positive-score ratio | 4.9124 | 4.7299 |
| Largest ratio over the corpus | 40.2 | 40.2 |
| Flags under A's 1.5/+100 rule | 41 | 40 |
| Flags under C's floored 3/+100 rule | 33 | 30 |
| Of those C flags, zero-to-positive | 5 | 5 |
| Avoidable A-rule flags left | 1 | 4 |
| Avoidable C-rule flags left | 0 | 0 |
| Drops shown | 27, in 10 runs | 8, in 5 runs |
| Largest displayed drop | 80.2215% | 6.3628% |
| Fresh rating calls per corpus preparation | 381 | 1967 |
| Sum of mean rating times | 319.52 ms | 1264.49 ms |
| Per-puzzle rating time: median / p95 / max | 3.50 / 29.34 / 138.30 ms | 5.88 / 193.20 / 596.95 ms |
| Largest individual solve | 111.45 ms | 195.23 ms |
| Total preparation, including model/verification work | 331.43 ms | 1368.54 ms |
| Prepared rating entries | 500 | 2086 |
| Sidecar: median / maximum | 1982 / 13034 B | 4797 / 20144 B |
| Sidecars summed over corpus | 86592 B | 262203 B |
| Largest retained value-buffer allocation | 20664 B | 197784 B |
| Persistent cache/history/export bytes added | 0 | 0 |

C has fewer steps in **33/35** cases; the two very-easy Samurai cases increase from four to five.
Its largest ratio is lower in **9**, higher in **11**, and equal in **15** cases.
Therefore its strongest demonstrated benefit is **pacing and shorter explanations**, not uniformly lower
score ratios.

## 3.4 Per-request behavior

All step counts below also equal the numerical-table count.
Every paired cell is **A/C**. “Flags 1.5” uses A's rule; “Flags 3” uses C's floored rule.
“Avoid 1.5” counts removable flags; **Avoid 3 is zero in every row**.

| Variant | Level | Seed | Steps | Max ratio | Flags 1.5 | Flags 3 | Avoid 1.5 | Drops |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| classic9 | expert | 3275974478 | 16/7 | 12.52/12.52 | 2/2 | 1/1 | 0/0 | 0/0 |
| classic9 | veryEasy | 1 | 7/5 | 1.61/1.72 | 0/0 | 0/0 | 0/0 | 0/0 |
| classic9 | veryEasy | 42 | 7/5 | 1.61/1.68 | 0/0 | 0/0 | 0/0 | 0/0 |
| classic9 | expert | 1 | 13/7 | 12.19/12.19 | 2/2 | 1/1 | 0/0 | 0/0 |
| classic9 | expert | 42 | 11/7 | 20.15/20.15 | 1/1 | 1/1 | 0/0 | 0/0 |
| classic9 | nightmare | 42 | 12/6 | 19.77/19.77 | 1/2 | 1/1 | 0/1 | 0/0 |
| killer | veryEasy | 1 | 8/6 | 1.61/1.72 | 0/0 | 0/0 | 0/0 | 0/0 |
| killer | veryEasy | 42 | 8/6 | 1.61/1.68 | 0/0 | 0/0 | 0/0 | 0/0 |
| killer | expert | 1 | 24/9 | 2.59/2.95 | 2/2 | 0/0 | 0/0 | 0/0 |
| killer | expert | 42 | 27/9 | 3.26/3.26 | 1/2 | 1/1 | 0/1 | 1/0 |
| killer | nightmare | 42 | 28/9 | 4.94/3.92 | 2/2 | 2/2 | 0/0 | 2/0 |
| samurai | veryEasy | 1 | 4/5 | 1.02/1.73 | 0/0 | 0/0 | 0/0 | 0/0 |
| samurai | veryEasy | 42 | 4/5 | 1.02/1.76 | 0/0 | 0/0 | 0/0 | 0/0 |
| samurai | expert | 1 | 14/8 | 4.91/4.73 | 1/1 | 1/1 | 0/0 | 1/0 |
| samurai | expert | 42 | 14/8 | 13.35/13.15 | 1/1 | 1/1 | 0/0 | 0/0 |
| samurai | nightmare | 42 | 14/8 | 20.63/20.60 | 1/1 | 1/1 | 0/0 | 0/0 |
| greaterThan | veryEasy | 1 | 12/5 | 1.00/1.00 | 0/0 | 0/0 | 0/0 | 0/0 |
| greaterThan | veryEasy | 42 | 12/5 | 1.00/1.00 | 0/0 | 0/0 | 0/0 | 0/0 |
| greaterThan | expert | 1 | 16/11 | 3.93/3.87 | 1/1 | 2/2 | 0/0 | 5/2 |
| greaterThan | expert | 42 | 23/9 | 4.07/4.02 | 5/2 | 5/2 | 0/0 | 9/1 |
| greaterThan | nightmare | 42 | 12/7 | 13.64/12.45 | 1/1 | 2/2 | 0/0 | 1/0 |
| jigsaw9 | veryEasy | 1 | 7/5 | 1.61/1.72 | 0/0 | 0/0 | 0/0 | 0/0 |
| jigsaw9 | veryEasy | 42 | 7/5 | 1.61/1.72 | 0/0 | 0/0 | 0/0 | 0/0 |
| jigsaw9 | expert | 1 | 14/7 | 12.06/12.06 | 1/1 | 1/1 | 0/0 | 0/0 |
| jigsaw9 | expert | 42 | 16/7 | 12.51/12.51 | 1/1 | 1/1 | 0/0 | 0/0 |
| jigsaw9 | nightmare | 42 | 16/8 | 12.88/12.88 | 2/1 | 1/1 | 0/0 | 1/1 |
| classic9 | hell1 | 2400651925 | 26/7 | 25.66/25.66 | 2/2 | 1/1 | 0/0 | 0/0 |
| classic9 | hell1 | 2299986211 | 60/7 | 40.20/40.20 | 1/2 | 1/1 | 0/1 | 0/0 |
| greaterThan | hard | 3115968914 | 12/7 | 4.26/4.99 | 1/1 | 2/2 | 0/0 | 3/2 |
| greaterThan | hard | 3099191295 | 12/7 | 2.48/2.53 | 1/1 | 1/1 | 0/0 | 3/2 |
| jigsaw9 | nightmare | 3962167687 | 17/9 | 5.48/5.48 | 3/3 | 1/1 | 0/0 | 1/0 |
| killer | expert | 3514204290 | 24/10 | 3.17/3.17 | 2/2 | 1/1 | 0/0 | 0/0 |
| mega16 | hell2 | 12 | 11/6 | 32.48/25.32 | 2/2 | 1/1 | 0/0 | 0/0 |
| samurai | hell2 | 13 | 15/8 | 9.43/9.25 | 2/2 | 1/1 | 1/1 | 0/0 |
| killer | hell2 | 16 | 27/10 | 5.77/5.77 | 2/2 | 2/2 | 0/0 | 0/0 |

### Avoidable medium rises left by the two baselines

| Plan/case | Displayed interval | Verified internal sequence that removes the 1.5/+100 flag |
|---|---|---|
| C, Classic Nightmare 42 | 870 → 1572 | 870 → 1234 → 1570 → 1572 |
| C, Killer Expert 42 | 555 → 836 | 555 → 599 → 836; omit the small 595 dip in compact view |
| C, Classic Hell 1 2299986211 | 2010 → 3274 | 2010 → 2281 → 2377 → 3274 |
| A, Samurai Hell 2 13 | 1416 → 4010 | 1416 → 2095 → 2401 → 3425 → 3886 → 4010 |
| C, Samurai Hell 2 13 | 1304 → 3886 | 1304 → 1416 → 2095 → 2401 → 3425 → 3886 |

These are not a failure of C's stated **×3** policy; they show why lowering the badge threshold without
changing the selector would make its “unavoidable” claim false.
They also show why my old fixed batches are not the finished redesign.

### A smaller displayed ratio can hide a larger real move

Greater-Than Hard **3115968914** illustrates why “smaller maximum ratio” is not a complete quality metric.
A batches:

```text
152 … 151,130,649,649,647,647
```

into **152 → 647**, ratio **4.2566**.
C exposes the actual **130 → 649** rise, ratio **4.9923**.
The latter is numerically larger because it does not hide the preceding drop inside the same batch.
Its explanation is more faithful to that particular threshold.

## 3.5 Per-request costs and sidecars

Every paired cell is **A/C**.
Times are rating-call time only; the aggregate table separately reports full preparation.

| Variant | Level | Seed | Fresh ratings | Rating ms | Sidecar bytes |
|---|---|---:|---:|---:|---:|
| classic9 | expert | 3275974478 | 13/30 | 3.67/3.48 | 2235/3330 |
| classic9 | veryEasy | 1 | 4/20 | 0.10/0.47 | 690/1911 |
| classic9 | veryEasy | 42 | 4/19 | 0.09/0.58 | 690/1830 |
| classic9 | expert | 1 | 10/27 | 0.66/0.83 | 1599/2786 |
| classic9 | expert | 42 | 8/25 | 0.49/0.97 | 1300/2547 |
| classic9 | nightmare | 42 | 9/26 | 3.50/5.15 | 1727/2918 |
| killer | veryEasy | 1 | 4/20 | 0.10/0.28 | 716/1937 |
| killer | veryEasy | 42 | 4/19 | 0.07/0.32 | 716/1856 |
| killer | expert | 1 | 20/37 | 9.08/7.35 | 3830/4769 |
| killer | expert | 42 | 23/40 | 6.88/7.42 | 4451/5306 |
| killer | nightmare | 42 | 24/41 | 12.73/14.14 | 4908/5749 |
| samurai | veryEasy | 1 | 1/21 | 0.06/0.69 | 365/1992 |
| samurai | veryEasy | 42 | 1/21 | 0.06/0.68 | 365/1992 |
| samurai | expert | 1 | 11/131 | 6.19/35.52 | 2200/14552 |
| samurai | expert | 42 | 11/129 | 2.59/14.16 | 1753/11951 |
| samurai | nightmare | 42 | 11/131 | 10.88/30.80 | 1902/13026 |
| greaterThan | veryEasy | 1 | 8/108 | 0.39/5.88 | 1531/13526 |
| greaterThan | veryEasy | 42 | 8/108 | 0.19/2.40 | 1162/9057 |
| greaterThan | expert | 1 | 12/100 | 3.88/31.52 | 2913/18922 |
| greaterThan | expert | 42 | 18/110 | 9.37/46.20 | 4345/20144 |
| greaterThan | nightmare | 42 | 8/94 | 15.82/132.93 | 2167/17524 |
| jigsaw9 | veryEasy | 1 | 4/20 | 0.06/0.25 | 690/1911 |
| jigsaw9 | veryEasy | 42 | 4/20 | 0.07/0.23 | 690/1911 |
| jigsaw9 | expert | 1 | 11/28 | 0.60/0.63 | 1760/2923 |
| jigsaw9 | expert | 42 | 13/30 | 1.69/1.27 | 2396/3523 |
| jigsaw9 | nightmare | 42 | 13/30 | 4.64/7.60 | 2214/3349 |
| classic9 | hell1 | 2400651925 | 17/34 | 29.34/24.57 | 5157/5956 |
| classic9 | hell1 | 2299986211 | 14/31 | 21.13/21.41 | 13034/12813 |
| greaterThan | hard | 3115968914 | 8/102 | 2.23/24.42 | 1982/17510 |
| greaterThan | hard | 3099191295 | 8/100 | 2.10/28.31 | 2072/18706 |
| jigsaw9 | nightmare | 3962167687 | 14/30 | 4.25/4.36 | 2847/3901 |
| killer | expert | 3514204290 | 20/37 | 4.69/5.09 | 3816/4797 |
| mega16 | hell2 | 12 | 8/76 | 138.30/596.95 | 1723/8228 |
| samurai | hell2 | 13 | 12/132 | 10.01/193.20 | 2158/13636 |
| killer | hell2 | 16 | 23/40 | 13.61/14.46 | 4488/5414 |

The known final rating was copied at the last move in **34** cases.
In the remaining Jigsaw case, the final board had already appeared and was served from the identical-state
memo. A production cache seeded with the final board's signature can also avoid rating that earlier duplicate.

Individual timing reversals with fewer A calls are shared-machine/cache/JIT noise, not evidence that
performing extra solves is intrinsically cheaper. Call counts and the large-board totals are the more robust
comparison. Retaining only log offsets/selected value snapshots can reduce C's buffer cost without changing
the selector or any persistent format.

# 4. Revised positions and a tested combined proposal

## 4.1 What I adopt from the peer

1. **Default compact score-selected milestones**, not just the minimal 16-step fix.
2. **One search interval for long neutral-swap stretches**, with net board changes and gross move counts.
3. **An explicit current-score change**, especially in the Total, and clear new-peak row emphasis.
4. **A quieter two-tier explanation policy:** large badge plus concise reason for smaller meaningful rises.
5. **Additional uniqueness confirmation when the proof assumes uniqueness.**
6. **The 1,000,000-check starting guard**, replacing my under-tested 100,000 default.
7. **Optional first-use prose**, folded and labeled as the selected logical proof.

## 4.2 What I keep or strengthen

1. **Post-result worker analysis**, with a separately scheduled, bounded `file://` fallback.
2. **Always-present table/status**, including honest pending/capped/unrated states; never invented scores.
3. **Correct active constraints at every endpoint**, particularly signs.
4. **Complete-move details as an optional view**, where genuine refinement decreases are retained.
5. **No persistent replay payload or puzzle-format change.**
6. **Explicit limitation of causal language** to the selected solver and locally checked subdivisions.
7. **Special handling of position 0**: it is the empty pre-generation canvas, not the full solution and
   not a valid zero-difficulty puzzle. Source: `generator/js/ui/player.js:399–413`.

## 4.3 Prefer zero-drop compact chapters, with a details view

I reran the peer selector on exactly the same rated pool, changing only `tolerance`:

| Selector | Total steps | Drops | Positive-score ×3/+100 flags | Corpus maximum ratio |
|---|---:|---:|---:|---:|
| Original C, tolerance 0.1 | 250 | 8 | 25 | 40.2 |
| C, tolerance 0 | 242 | 0 | 25 | 40.2 |

**30/35 score sequences are identical.** Among the changed cases, four have a smaller largest ratio;
none has a larger one. Examples:

```text
Greater-Than Expert 1:
0,0,269,276,986,990,990

Greater-Than Hard 3115968914:
0,0,130,638,638

Jigsaw Nightmare 42:
0,25,44,49,138,1678,1678
```

This favors a strictly nondecreasing **compact** view for the initial product, with labeled mixed-phase/tuning
intervals and access to the actual decreases in details. It is a preference based on this corpus, not proof
that every future zero-drop summary is more informative.

## 4.4 Repair the selector's invariants before claiming irreducibility

`E\cross-revised-selector.cjs` prototypes:

1. split selection into restart-delimited chapters;
2. use zero-drop eligibility within each chapter;
3. retain the **last eligible** state of each contiguous phase;
4. run the compact selector;
5. for every positive-score ×3/+100 output edge, search its rated chronological interval for a
   nondecreasing path with no flagged edge and insert that path when available;
6. add mandatory structure/final screens.

Results on the common corpus:

```text
35 requests
243 steps
0 drops
25 positive-score large-jump flags
0 remaining avoidable large-jump flags at recorded complete-move boundaries
```

No extra ratings are needed for this audit: it uses the prepared pool.
The single added screen compared with the 242-step zero-tolerance run restores the missed phase boundary.

The synthetic overshoot is repaired:

```text
0,23,44,100,400,992
becomes
0,23,44,100,200,400,992
```

The restart test preserves both chapters:

```text
0,23,44,551,0,23,44,600,992
```

This does not settle whether asymmetric within-group snapshots are permitted.
“Irreducible” remains explicitly relative to the allowed checkpoint set.

## 4.5 Combined explanation for the reported seed

Keep the seven-step compact sequence:

```text
0,23,44,551,568,992,992
```

At **44 → 551**, show a large-jump badge and a short visible reason:

> Removing R1C2 and R9C8 changes the generator's logical solution from singles to Simple Colouring
> (weight 360; two uses). The two extra empty cells add only about 0.91 points.

Expanded details show the term changes, the other candidate objectives with correct provenance,
and the verified **44 → 550 → 551** local probe.

At the five-swap interval **568 → 992**, show a concise reason without a ×3 badge:

> After the clue exchanges, the logical solution uses XYZ-Wing (weight 750) instead of Simple Colouring
> as its hardest technique (weight 360). Empty cells stay at 51.

Expanded comparison uses the **compact interval's actual start**:
`W 906.5 → 806.75`, not the single final swap's `906.75 → 806.75`.
The work term can rise despite that decrease because `P` also changes.
The detailed view can still show the single final exchange with the other correct baseline.

Every displayed number continues to come from the current board's canonical rating.
Neither language may say that Simple Colouring or XYZ-Wing is the only possible way to solve the puzzle.

# 5. Evidence, reruns, and preservation

## 5.1 External artifacts

Own directory: `E\` = `experiments\gpt-6-astra\`; peer directory, read-only: `C\` = `experiments\claude-opus-5.5\`.
Both are in the session folder of the orchestrating agent and are **not part of the repository**.

| Own script/output | Purpose |
|---|---|
| `cross-audit.cjs`, `cross-audit.json` | Peer raw-data arithmetic, named-technique ablations, missing-log/restart checks |
| `cross-common.cjs`, `cross-common.json`, `cross-corpus.json` | The fixed 35-case common comparison |
| `*.cross.json` | Per-case selected endpoints, all canonical counts/scores, cost and behavior records |
| `cross-*.wire.json` | The nine newly generated fixed results, outside the repository |
| `cross-summary.cjs`, `cross-summary.txt`, `cross-aggregate.json` | Common tables and metric totals |
| `cross-phase-misses.json` | Real missed eligible phase boundary |
| `cross-focused.cjs`, `cross-focused.json` | Unsafe UR rating, cap paths, selector counterexample, verified partial splits |
| `cross-selector-variants.cjs`, `cross-selector-variants.json` | Zero versus 0.1 tolerance, without additional solves |
| `cross-revised-selector.cjs`, `cross-revised-selector.json` | Repaired compact selector and restart/overshoot checks |
| `cross-table-deltas.cjs`, `cross-table-deltas.json` | Disappeared-row delta accounting |
| `cross-verify.cjs`, `cross-verification.json` | Final uniqueness, request matching, result hashes, protected-file checks |
| `cross-preservation.json` | Starting SHA-256 hashes of both independent reports and the 20 peer scripts |

## 5.2 Re-run

Use the existing external scripts from the independent phase and the new scripts above.
No package installation is needed.

```powershell
Set-Location <E>   # the experiment folder of gpt-6-astra (not part of the repository)

node .\cross-audit.cjs
node .\cross-common.cjs
node .\cross-summary.cjs
node .\cross-focused.cjs
node .\cross-selector-variants.cjs
node .\cross-revised-selector.cjs
node .\cross-table-deltas.cjs
node .\cross-verify.cjs
```

The common runner reuses existing wire results; only missing new-case results are generated.
It imports peer helpers read-only and writes exclusively to the current **own** experiment directory.
Keep the working directory as shown.

No quick/full/manual test suite, soak, perf, qualify, browser script, regression-hash update, or deep mode
was run. The nine known higher-level generation requests are not the forbidden heavy test programs.

## 5.3 Validation and git state

Starting `git --no-pager status --short`:

```text
?? docs/generation-steps/
```

Starting HEAD:

```text
8d9510aade5d99f4fec9fda3835245a31f411ede
```

Validation before writing this review:

```text
protectedFiles: 22
allProtectedUnchanged: true
finalPuzzles: 35
finalUnique: 35
digestsMatch: 35
sameRequests: 35
canonicalEntries: 2086
canonicalCacheHits: 50
nonfinalDfsChecks: 2002
maxFinalDfsChecks: 10304
```

The protected files are both independent reports and the peer's 20 existing scripts.
Final validation confirmed they remain byte-identical. This new review has consistent CRLF line endings
and valid relative links; no earlier report was normalized or rewritten.

Final `git --no-pager status --short`:

```text
?? docs/generation-steps/
```

`git --no-pager diff --name-only` returned no tracked-file changes.
HEAD remains `8d9510aade5d99f4fec9fda3835245a31f411ede`.
The only repository file written by this cross-review is this new report.

# Decisions for the user — merged and updated

The following list merges both reports. “Recommended” is my revised default, not an assertion that the user
has already selected it.

1. **Unavoidable real jumps — decided at 13:54.** They are accepted after meaningful grouping/splitting
   cannot remove them. Do not invent/interpolate difficulty scores.
2. **Explaining a surviving jump — decided at 13:54.** The UI must visibly explain why, using the changed
   move/constraints and the actual proof/score terms—not just show the difference.
3. **Generation and final puzzle — original fixed requirement.** Same request/seed, same algorithm,
   same final puzzle/rating; no regression/qualification/cache-key change.
4. **A table at every step — original fixed requirement.** Keep zero and unchanged tables. For a genuinely
   pending/capped/unrated state, show an explicit status and no fabricated numeric difficulty.
5. **Default detail level — open.** Recommend compact milestones by default, with optional complete-move
   details. The reported seed then has **7** compact steps or **16** corrected-batch detail steps.
6. **Drop policy — open.** Recommend nondecreasing compact chapters; show real decreases and peaks in
   details, and describe folded tuning. The 0.1-tolerance alternative retains more small dips.
7. **Large-jump threshold — open.** Recommend positive-score **×3 and +100** for a prominent badge,
   concise explanation for smaller meaningful rises, and no numerical multiplier from zero.
8. **What subdivisions are allowed — open and important.** Recommend whole symmetry groups in the normal
   replay, with verified partial boards as diagnostic details. If asymmetric internal display frames are
   allowed, the verified **46→136→252** and **168→340→533** cases should be split; they must not be called
   unavoidably large without that scope qualification.
9. **Phase boundaries and restarts — open.** Recommend each compatible last eligible phase endpoint,
   mixed-phase text when an interval is combined, and independent restart chapters.
10. **Search swaps — open granularity choice, required correctness constraint.** Never expose an unevaluated
    half as a normal puzzle step. Compact view may combine neutral swaps; details show complete changes.
    Mark net changes on the board and report gross counts in text.
11. **Where/when to rate — open.** Recommend a separate **post-result worker** job. Show the final puzzle
    immediately; keep a scheduled fallback for `file://`. Do not promise few-ms pauses for a synchronous solve.
12. **Work guard and failure behavior — open implementation policy.** Recommend **1,000,000** checks,
    bounded uniqueness confirmation, known-final reuse, and explicit retry/status behavior.
13. **Setup and final screens — open presentation details.** Recommend numerical **0** tables for the filled
    solution and structure screens, a separate final Summary-equivalent table, and “not a puzzle yet”
    for the empty pre-generation position 0.
14. **Persistence/protocol — open.** Recommend no persistent replay data and no export/history/cache-key
    change. A separate worker sidecar message is acceptable; it does not change puzzle identity.
15. **Callout length and formula placement — open.** Recommend a short visible reason plus accessible
    `P/W/E` comparison details. Use Total delta by default; per-row deltas need disappearing rows accounted for.
16. **First-use proof, clue-cause mark, slider markers — optional/open.** Folded proof prose and a cautiously
    worded local clue diagnostic are useful. Defer a proof-board overlay and slider markers; never draw a late
    logical pattern on the wrong board state.

My recommendation is the corrected compact design in §4, with these unresolved presentation policies made
explicit, rather than treating the peer prototype or my minimal fix as a production-ready implementation.
