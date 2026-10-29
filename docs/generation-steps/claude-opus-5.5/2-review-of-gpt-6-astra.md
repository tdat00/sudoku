# Cross-review of gpt-6-astra's report — Generation Steps

**Reviewer:** claude-opus-5.5  
**Date:** 2026-10-28  
**Reviewed:** [`../gpt-6-astra/1-report.md`](../gpt-6-astra/1-report.md) (1,988 lines, read in full, including its
"Addendum — after the user's decision of 13:54") and its experiment folder `GA\` (read-only; outside the repository).  
**Code examined:** commit `8d9510a` of `tdat00/sudoku` (unchanged).  
**Scope:** critical review section by section (§1); the points where the two reports disagree (§2); a head-to-head of
both proposals on a common corpus of 104 requests (§3); errors found in both reports (§4); my revised positions (§5);
the converged proposal (§6); the experiments (Appendix X); the merged list of decisions (last section). Research only:
the only change in the repository is this new file (X4). My [`1-report.md`](1-report.md) is unchanged: it documents my
independent phase.

**Notation.**

- `GA\` = gpt-6-astra's experiment folder, `CO\` = mine, both in the session folder of the orchestrating agent
  (not part of the repository); the scripts and
  outputs of this phase are in `CO\xreview\` (Appendix X).
- "GA Lnn" is line nn of their report, "CO Lnn" line nn of mine. Source paths are relative to the repository root,
  line numbers those of `8d9510a`.
- Four replays are compared, all built from the same generations and the same ratings:
  - **C** — mine: the dig log replayed move by move, every position rated, steps chosen by score (CO C4);
  - **G16** — their recommended default "complete moves": today's steps with each local-search swap merged into one
    step, every step rated (GA C2 step 2, C3; their `correctedExisting`); named after its 16 steps on the example;
  - **GA** — G16 plus their AD2 step 2 as I implemented it: a flagged step that holds several moves receives the inner
    checkpoints that lower its largest rise (AD2 has no prototype in `GA\`);
  - **Gm** — their compact milestones: `select()` of `GA\prototype.cjs:92`, ported verbatim.
- Jump rules: **rule C** = mine, at least ×3 and at least +100 points, a score below 10 counting as 10 (CO C11.2);
  **rule G** = theirs, score before above 0, at least +100 points and at least ×1.5 (GA AD1).
- **✔** re-checked by me, in the source or by re-running; **✘** error; **?** not verified.

## 0. Verdict in brief

1. **Their report is careful and its facts hold.** Every number I re-ran matches exactly: the example (21 steps,
   30 clues, 992), their 16-step correction, their milestones, the 1,437 moves of the 26 shared puzzles, the 16 subset
   boards of the last swap, the formula terms of both rises, the two technique witnesses and the lighter-only solves.
   Every engine, worker, cache and history citation I opened is right. The errors are minor: six `player.js` line
   numbers of A5 are 6–7 lines early and five other ranges are slightly off; which view is the default is stated three
   ways; the milestone selector they describe is not the one their prototype implements, and the AD2 smoothing has no
   prototype (§4.1).
2. **Same diagnosis, same constraints.** No table because the step kind is not rated or the step shows the removal
   half of a swap (2 solutions); the 1849 is an artefact of that split; the 400 ms budget plays no part; 44 → 551 is
   genuine (R1C2 alone already scores 550); a swap is one move; true scores, no interpolation, nothing persisted, no
   engine change; Greater-Than rated with the signs still present; the same score is not the same table (the five
   568 positions have different counts).
3. **The real difference is the number of steps.** Their default keeps today's batches (median 13 steps, up to 60);
   mine chooses steps by score (median 7, at most 11). On 104 common requests both give a table on 100 % of the steps,
   and the largest rise — usually the unavoidable guided move — is the same in 60 runs and smaller with C in 41. But G16
   shows 146 flat steps (up to 43 in a row), 560 rises under ×1.1 and 25 drops of more than 10 % (worst −95 %), C 11,
   83 and 0. On the example G16 keeps the pattern the user complained about (568 five times, then 992). Their own
   milestone view (Gm) is as smooth as C but shorter (median 5; their 8–12 target met in 3 runs, C in 45), mixes
   phases and leaves 2 avoidable rule-C jumps.
4. **Jump threshold.** On C's steps their rule flags 110 rises, mine 93; 80 in common. Their 30 extra rises are
   between ×1.5 and ×3 (e.g. 568 → 992), steady by the user's own example; my 13 extra are all Greater-Than openings
   (0 → 115…292), which they rightly call "first rated puzzle". My ×3 also flags the user's own steady steps (×3.0,
   ×3.33): I revise it to at least ×3.5 (68 rises).
5. **The explanation converges.** Same content (hardest technique before and after with weight and uses, the P/R/V
   terms, the clue that causes it, the scope of the claim). Their wording is safer: "the logical solution now uses X"
   is always true; my "cannot be finished without X" is false for 9 of 93 jumps (all Greater-Than openings, where a
   lighter proof exists). My additions stand: the round's alternatives from the `keep` scores (exact in 840 of 840
   numeric cases; 79 are null and need a fallback), the level change, the frame on the culprit clue.
6. **Where to rate: I adopt theirs** — a job in the worker after `done`, the page as fallback — because one rating
   cannot be sliced: up to 104 ms for a single move in Node (Samurai nightmare), 389 ms for all moves of one puzzle.
7. **Adopted from them:** "first rated puzzle", "Not a puzzle yet" at position 0 and explicit table states, the "New
   hardest technique" row badge on every new peak, wording that follows the direction of the data, the proof-scope
   caveat, the first use as text only, scoped split statements, the worker job, their tests. **Kept:** steps chosen by
   score as the default, phases end steps, dips ≤ 10 %, the culprit frame, the choice sentence, a jump badge only for a
   real leap (§5).
8. **Decisions:** 4 settled by the user at 13:54, 4 points agreed by both researchers, 10 open (last section).

---

## 1. Section-by-section review

Each subsection lists what I re-checked, what they found that I missed, and errors.

### Executive summary (GA L20–53)

- ✔ Items 1–4 equal my B1–B3 (CO L176–262): 21 steps; no table on 11–18; 1849 at 19; 992; the four removal halves
  have 2 solutions; `reveal` and `final` excluded; 44 → 551 genuine. They count 10 steps without a table and I count 9
  because they include step 1's sentence; same facts.
- ✔ Item 6: the 16-step sequence is reproduced exactly by G16 (§3.4).
- ✔ Item 7: their largest true rise ×20.625 (Samurai nightmare 42, 72 → 1485) is G16's maximum on their 25 requests
  between positive scores (`out-h2h-extra.txt`); 21 decreases in 8 runs on today's steps become 20 in 7 once the
  half-swap 1283 → 987 of Classic expert 1 is merged.
- ✔ Item 8: my move counts equal their 1,437 atomic checkpoints, puzzle by puzzle (26 of 26, `out-port-check.txt`).
- ✘ Item 5 against their own Decisions table: §4.1 #3.

### A1–A2. Request and score (GA L57–121)

- ✔ `SG.store.toConfig`: my page configuration equals their `request()` for 4 requests (`config-check.js`).
- ✔ Band starts (expert [700, 1000)); the formula; `rate` with every technique; incomplete proof → `score: null`; "more
  empty cells do not imply a higher score" (`generator/js/engine/difficulty.js:15–23`).

### A3. The generator is a search (GA L123–155)

- ✔ Guided start 0.47 and 32 / 4 candidates (`generator/js/engine/digger.js:602, 605–606`); refinement keeps an
  addition when `score >= spec.min` (`digger.js:1092–1099`); local search rejects incomplete, lower and too-high scores
  (`digger.js:1469`); proposals from Nightmare (`difficulty.js:117`); caps of 1,024 ratings and 32,768 proposals
  (`digger.js:630–631`). Their phase table is a clearer summary than my A4.

### A4. Replay from the dig log (GA L157–214)

- ✔ Batch rules (`generator/js/ui/player.js:44–54`).
- ✔ **Missed by me:** a removal-only and an addition-only local-search move kept one after the other write the same
  two entries as a swap (`accept`, then `reveal` with `reason: 'search'`; `digger.js:1362–1370`), so the log cannot
  tell them apart. Both designs merge such a pair; its end is a real position, but my key `steps.jump.move.swap`
  ("This step is a single move of the generator", CO L771) claims too much (§4.2 #7).
- ✘ Minor: the split is at `player.js:324–338` (cited 322–336).

### A5. Every reason a table is absent (GA L216–245)

- ✔ The list is complete and matches my B2 (CO L215–236); their extra rows are right and useful: the renderer's gate
  on positive counts (`generator/js/ui/step-view.js:415–426`), the memo of `null`, the backward scan of `rateStep`.
- ✘ Six `player.js` line numbers are 6–7 lines early (§4.1 #1); `RATE_BUDGET_MS` at 42 is right.
- ✔ The budget samples its clock every 1,024 checks (`core/js/engine/budget.js:3, 12, 65–68`; they cite line 8).

### A6. Worker, cache, history, export (GA L246–267)

- ✔ 120,000 ms guard and 12 ms slices (`generator/js/worker/gen.worker.js:77, 80`); cache schema 2, limit 20,
  `delete wire.digLog` (`generator/js/ui/cache.js:42, 44, 205`); history version 1, limit 100
  (`generator/js/ui/history.js:19–20`); no dig log in exports.
- ✔ The re-entrancy warning (at `generator/js/engine/pipeline.js:131–132`; cited 116–130); wire version 1 (at
  `pipeline.js:258`; cited 247).
- ✔ **Missed by me:** a cache hit rebuilds the replay from a regenerated dig log (`cache.js:998` → `app.attachTrace` →
  `loadReplay`, `generator/js/ui/app.js:858–866`), so the analysis must start there too. My job starts in
  `player.load`, which `loadReplay` calls; a worker job must be requested from the same place.

### B1–B3. Method, origin and steps of the example (GA L269–408)

- ✔ One full grid, 12 samples, the third one (568, 30 clues), then 5 swaps to 992; the moves I replay are 22 random,
  4 guided and 5 swaps (32 positions with the solution; `out-example-details.txt`).
- ✔ Their step table equals my B1 row by row (CO L185–207).
- ✔ The five 568 positions differ: Naked Singles 29 / 30 / 30 / 31 / 28, Hidden Singles in boxes 22 / 21 / 21 / 20 /
  23 (re-run, identical). A table must never be copied from the step before; my report did not propose it but did not
  say it either.
- ? Per-step times (shared machine; same order as mine).
- **Missed by them:** today's split can also show a *score* for a board with two solutions: `classic9` hell1 seed
  2400651925, step 35, rated 3422 with a Unique Rectangle, has 2 solutions (CO L41–44, L231; `CO\out-artifact.txt`).
  Their sample has no such case.

### B4. The two jumps (GA L410–458)

- ✔ E, P, W, V, R of steps 6, 7, 10, 19 and 20. W is 906.5 at old step 10 and 906.75 at old step 18 (AD4); both are
  right because the counts differ (29 + 22 × 1.25 + 2 × 40 + 50 + 720 = 906.5; 28 + 23 × 1.25 + … = 906.75).
- ✔ The subsets 44 / 550 / 44 / 551 equal my C11.5.

### B5–B6. Sample, decreases, unrated positions (GA L460–556)

- ✔ My regeneration of their 25 requests gives their sequences exactly (26 of 26 with the example,
  `out-port-check.txt`): the two samples are the same puzzles and join into one corpus (§3.1).
- ✔ 0 timeouts, 0 unrated, 0 ambiguous; here 0 unrated positions among 5,920 moves.
- ✔ The table of decrease causes; ✔ "a unique position may lack a complete rating (proposal, minimal signs); none was
  observed" — agreed (CO B4).
- Their missing-table rate (30.2 %) counts the solution and structure sentences (35 of 100); mine (17 %, CO B5) does
  not. Without them theirs is 65 / 331 = 19.6 %.

### C1. The requirement conflict (GA L560–583)

- ✔ Fully agreed; it is my item 6 (CO L54–58). "There is no intermediate-value theorem on clue subsets" is the
  shortest way to say it.

### C2. Recommended design (GA L585–674)

- Step 1 ✔ (the result is immutable; no RNG, cap or configuration change) — as my C1.
- Step 2 ✔ a swap is one move; symmetry groups are never split; `keep` entries are not removals.
- Step 3 ✔ **better than mine:** explicit Pending, Timed out, Unique-but-incomplete, Multiple-solutions and Missing
  states, and "Not a puzzle yet" at position 0. Adopted.
- Step 4 ✘ the selector they describe is not the one their prototype implements, and the prototype misses their own
  8–12 target (§4.1 #4).

### C3. Before and after (GA L676–724)

- ✔ Today's sequence, the 16-step correction, the milestones `0, 36, 44, 551, 557, 992`.
- ✔ The "smooth progress number" is labelled as not a score; both reports reject it, and the user settled it at 13:54.
- The 16-step correction fixes requirement 2, not requirement 3: five 568s before the 992 is the "35, 40, 40, 1000"
  pattern the user described.

### C4. Prototypes (GA L726–830)

- ✔ A (counts, digests). B (supersets rebuilt backwards) agrees with my superset test (CO C8: 2,151 supersets of the
  example, none between 45 and 900; theirs: all 51 one-cell additions score 47 or 992). C (separate ladders): agreed,
  not a replay.

### C5. Where to compute (GA L832–866)

- ✔ **The decisive point I missed:** one logical solve cannot be resumed, so slicing in the page cannot remove the
  pause of the longest rating. Among the 27 nightmare and hell1 requests of the corpus the longest non-final rating is
  104.36 ms (Samurai nightmare 2574903663, a refinement `reveal`), then 94.02 ms (Killer nightmare 1445283430)
  (`out-example-details.txt`); a phone takes several times longer. Adopted (§5 #9).
- The guard: theirs 100,000 checks with a retry up to 1,000,000, mine 1,000,000. Equivalent on every measured position
  (theirs needed at most 8,078 checks, mine 134,627 on heavy boards; CO C3).

### C6. Variants and phases (GA L868–912)

- ✔ Killer with its cages fixed and a total-0 table for the solution and the cages; Greater-Than rated with
  `SG.greaterThan.withSigns` and the signs still present (`generator/js/variants/greater-than.js:103–121`); a multigrid
  is one solve over global cells. Same as mine (CO C3, C11.6).
- "Keep genuine score decreases in the complete-move view" (GA L906): in their default view that means 77 decreases in
  28 runs, the worst −95 % (§3.5). Right for a details view, not for the default.

### C7. Cost (GA L914–960)

- ✔ The buffer arithmetic (16 × 81 × 4 = 5,184; 133 × 369 × 4 = 196,308; 20 × 21,115 = 422,300) and the corrected
  sidecar of 1,728 B, which my G16 serialization reproduces.
- ? The unchanged cache, history and export bytes (not re-run; my configuration check agrees).

### D1–D6. Impact (GA L962–1086)

- ✔ D3: a pure module owned by the generator, used by both worker and page, listed in the generator's script lists
  only — better than my "functions in `player.js`" (CO C10).
- ✔ D4: the same documents as mine, plus `generator/task.md`.
- ✔ D5: the old split is asserted by `generator/tests/suites/player.test.js:336–377` (cited 334–376) and the table
  tests are at `steps.test.js:270–385`; their worker, cache and stale-reply tests are additions I lacked.
- ✔ D6: every risk applies to both designs.

### Decisions (GA L1088–1105)

- ✔ Settled at 13:54 as they mark it: true scores; a genuine jump accepted and explained; explanation mandatory; no
  synthetic number. "A swap is one step" is a recommendation (also mine), not a decision of the user.
- ✘ L1097 ("compact milestones plus optional complete-move details") and L1104 ("the recommended default … is the
  truthful, complete-move design") disagree (§4.1 #3).

### Appendix E1–E5 (GA L1107–1308)

- ✔ The scripts are present; the E3 sequences equal my regeneration; the cache-key string is right.

### AD1. When to show the explanation (GA L1324–1366)

- ✔ "25 increases flagged over 26 puzzles, all with a higher P": G16 under rule G flags 2 + 23 = 25 on the same 26.
- ✔ Good rules I adopt: "first rated puzzle" for a rise from 0; a badge on every new peak; no ratio against an unknown
  predecessor; the badge from the rounded scores, the terms from the unrounded breakdown.
- The threshold itself: §2 #3.

### AD2. Remove avoidable jumps first (GA L1368–1413)

- ✔ The order (merge swaps, inspect recorded boundaries, keep indivisible moves, optional local diagnostic, scoped
  statements) is right. Adopted.
- ✘ Steps 2–3 are not prototyped (§4.1 #6).

### AD3–AD4. Probes and explanation data (GA L1415–1566)

- ✔ Re-run (`out-ga-claims.txt`): the last swap removes R4C2 and R6C8 and restores R1C8 and R9C2; its 16 subsets are
  all unique and rated, distinct scores 47, 517, 553, 554, 568, 569, 992, 1167, 1680, 1849; Simple Colouring on 3
  eliminates at R5C2 and R8C3 at proof step 31 of 47; the XYZ-Wing (pivot R6C3, pincers R4C1 and R6C6) eliminates 3
  from R6C2 at step 28 of 52; with only techniques lighter than the new peak the solver is stuck (below 360, below 750).
- ✔ Their formula table, including W falling 906.75 → 806.75 while the score rises — a case my `steps.jump.formula`
  would word wrongly (§4.2 #2).
- ? The 24 single-cell orders of the last swap (plausible; not re-run).

### AD5–AD6. Placement and strings (GA L1568–1795)

- ✔ Same places as my C11.4: a visible callout with a keyboard disclosure, a badge on the row, the Before / After /
  Change tip, `aria-describedby`, no modal and no focus stealing. The differences are the heading badge and the board
  frame (§2 #5).
- ✔ 24 key blocks, both languages, through `SG.i18n.t()`, existing technique names (`locale.en.js:321, 331`,
  `locale.vi.js:316, 326`).

### AD7–AD9. Variants, cost, tests (GA L1797–1988)

- ✔ `constraintProof` for a change of signs only; the direction taken from the data (Killer 2780 → 2788 after clues
  were restored). Adopted.
- ✔ The callout needs no new solve. ? 336 / 389 B and 10.29 / 32.40 ms (not re-run); my partial ratings for every
  rule-C single-move jump of the corpus: 132 ratings, 30.2 ms in all.
- ✔ Their test list joins mine (§6.7).

---

## 2. Where the two reports disagree

1. **How many steps (16 vs 7).**
   - Mine: steps chosen by score among the rated moves (CO C4). Theirs: "complete moves", i.e. today's batches with
     swaps merged (GA L37–41, C3), milestones as an option or as the default (GA L657, L1097).
   - Evidence (§3.2–§3.5): same largest rise in 60 of 104 runs, smaller with C in 41; flat steps 11 vs 146; drops of
     more than 10 %: 0 vs 25. G16 can show its steps at once and fill the tables as ratings arrive; C needs all
     ratings first (median 2.85 ms per puzzle, at most 389 ms in Node). The finished puzzle and its table are on screen
     at once in both.
   - Verdict: C as the default (§5 #1).
2. **Milestones versus every move.** Mine: one view ("one step per move" only as an alternative, CO Decision 2).
   Theirs: two views. Verdict: I adopt two views, C as the summary and every move as optional details (§5 #2).
3. **Jump rule.** Mine: ×3 and +100, a score below 10 counting as 10. Theirs: ×1.5 and +100 with a score before above
   0, plus "first rated puzzle" and a new-peak badge. Evidence §3.6. Verdict: their exclusion of rises from 0 and their
   badge; at least ×3.5 and +100 for the leap badge and the full callout (§5 #3–#4).
4. **What the explanation says.** Mine: nine sentences (move, culprit, generator's choice, before, after with "cannot
   be finished without", formula, level, why not smaller, first use). Theirs: a heading with the numbers, two visible
   sentences ("now uses"), a disclosure with the terms, "work decreased", split scope and proof scope. Evidence
   §3.7–§3.8. Verdict: merged (§6.4).
5. **Where it appears.** Mine: heading badge, callout, highlighted row, tips, a `cause` frame on the culprit clue, an
   optional highlight of the first use, optional slider marks. Theirs: callout above the table, "New hardest technique"
   row badge, tip, disclosure, no pattern on the board. Verdict: merged; the culprit frame stays (it marks a clue of the
   board shown, not a pattern found mid-solve); the first-use highlight goes.
6. **Where and when to rate.** Mine: the page, in slices, after `load`. Theirs: a worker job after `done`, page slices
   as the fallback. Verdict: theirs (§3.9, C5 above).
7. **Solution and structure steps, position 0.** Mine: a table with total 0. Theirs: the same, plus "Not a puzzle yet"
   at position 0 and explicit states. Verdict: theirs (it contains mine).
8. **Refinement and decreases.** Mine: excursions folded into a step with a "peak" sentence, dips ≤ 10 % shown with a
   line. Theirs: every decrease shown in the complete-move view, a drop callout from ×1.5 and −100, the summary merges
   the interval. Verdict: mine in the summary, theirs in the details view.
9. **Swaps.** Both: one step; they add a caution about the ambiguous log. Verdict: agreed, with their caution
   (§4.2 #7).
10. **Killer, Greater-Than, multigrid.** Same in substance. They add `constraintProof` for a change of signs; I add the
    Greater-Than opening wording and grid-qualified cell names (`G4-R1C7`, `core/js/engine/model.js:472–490`).
    Verdict: merged.
11. **Persistence and export.** Both: nothing stored, keys and formats unchanged; they verified the bytes. Agreed.
12. **Tests.** Same suites (`player`, `steps`, `i18n`; `ui-contract` if a file is added). They add worker, cache and
    pipeline cases, stale replies, zero solver calls on a language change; I add the example's sequence and the step
    invariants. Verdict: the union (§6.7).

---

## 3. Head-to-head on a common corpus

### 3.1 Corpus and method

- **104 requests:** the example; their 25 (`classic9`, `killer`, `samurai`, `greaterThan`, `jigsaw9` × veryEasy seeds
  1 and 42, expert seeds 1 and 42, nightmare seed 42); my 78 of phase 1 (`CO\out-sample.jsonl`: `classic9` easy, hard,
  expert, master, nightmare, hell1 × 5 seeds; `jigsaw9`, `samurai`, `killer`, `greaterThan` × easy, hard, expert,
  nightmare × 3 seeds).
- Each request is generated once with the page's configuration (`SG.store.toConfig`) and the normal 120 s guard; its
  dig log is replayed move by move and every position rated once (`SG.difficulty.rate`, work guard 2,000,000 checks,
  Greater-Than with its alive signs, DFS confirmation when the proof assumed uniqueness). The four replays are built
  from those ratings: C with my phase-1 `segment` unchanged; G16 by mapping every step of `SG.player.buildSteps(result)`
  to its move after merging swaps; GA by inserting, in a step flagged by rule G that holds several moves, the
  non-decreasing chronological path through its inner moves with the smallest largest rise when that lowers the step's
  rise; Gm with their `select()` (targets `35 · (S/35)^(j/(k−1))`, nearest in log distance, never at or above the final
  score; no separate finished-puzzle step).
- **Fidelity:** on the 26 shared requests G16, Gm and the move counts equal their own files exactly (§3.10).
- **Metrics:** steps and steps with a complete table; largest adjacent rise under two conventions (a score below 10
  counting as 10, mine; rises between positive scores only, theirs); jumps flagged by each rule; **avoidable jumps** — a
  flagged step whose inner rated moves contain a non-decreasing chronological path with no flagged sub-step; decreases
  shown, flat steps, rises under ×1.1; rating time; sidecar bytes (compact JSON `{score, counts, empties, status}` per
  displayed position).
- One process, Node v24.22.1, 96 s (93.1 s of it generation).

### 3.2 All 104 requests

| Replay | Steps: min / median / max (total) | With a table | Largest rise median / max (below 10 = 10); runs ≤ ×3 | Rule C jumps (runs) / avoidable | Rule G jumps (runs) / avoidable | Decreases shown (runs; worst) |
|---|---|---|---|---|---|---|
| **C** | 5 / 7 / 11 (761) | 761 / 761 | ×9.6 / ×40.2; 24 | 93 (76) / **0** | 110 (77) / 4 | 17 (12; −6.4 %) |
| G16 | 4 / 13 / 60 (1,542) | 1,542 / 1,542 | ×10.745 / ×40.2; 18 | 99 (77) / 0 | 113 (77) / 0 | 77 (28; −95 %) |
| GA | 4 / 13 / 60 (1,584) | 1,584 / 1,584 | ×10.543 / ×40.2; 18 | 100 (77) / 0 | 118 (77) / 1 | 77 (28; −95 %) |
| Gm | 3 / 5 / 8 (536) | 536 / 536 | ×9.6 / ×40.2; 0 \* | 95 (76) / 2 | 109 (77) / 3 | 0 |

\* Gm goes from 0 straight to about 35, which counts as ×3.5 when a score below 10 counts as 10; between positive
scores only, C 31, G16 30, GA 30 and Gm 29 runs stay ≤ ×3 (§3.5).

- Largest rise per run, C against G16: equal in 60, smaller with C in 41, larger in 3 (by at most ×1.14: Killer expert
  1 ×2.951 vs ×2.589, Killer nightmare 1411728192 ×4.08 vs ×3.596, Samurai nightmare 2591681282 ×6.202 vs ×6.069). C
  against Gm: equal 57, smaller 32, larger 15, all by small margins (`out-maxrise.txt`).
- C has fewer steps than G16 in 102 of 104 runs; the exceptions are Samurai veryEasy seeds 1 and 42, where C splits the
  single first batch (C `0 15 26 44 44`, `0 15 25 44 44`; G16 `0 43 44 44`).
- The longest G16 replay is `classic9` hell1 2299986211: 60 steps (106 today, 7 with C), 44 consecutive steps at 2010
  while the local search wanders on a plateau.
- Their 8–12 step target is met in 45 runs by C, 43 by G16, 39 by GA and 3 by Gm (`out-rules.txt`).

### 3.3 By sample and by variant

| Subset (requests) | C: steps median / largest rise median / decreases | G16 | Gm |
|---|---|---|---|
| Their 25 | 7 / ×4.2 / 4 in 3 runs (−6.4 %) | 12 / ×4.912 / 20 in 7 runs (−80.2 %) | 5 / ×4.918 / 0 |
| My 78 | 7 / ×10.543 / 13 in 9 runs (−6 %) | 13 / ×11.042 / 57 in 21 runs (−95 %) | 5 / ×10.543 / 0 |
| `classic9` (36) | 7 / ×12.652 / 0 | 12 / ×12.652 / 2 in 2 runs (−31.6 %) | 5 / ×12.652 / 0 |
| `killer` (17) | 9 / ×3.175 / 2 in 2 runs (−2.3 %) | 25 / ×3.175 / 7 in 6 runs (−53.4 %) | 6 / ×3.535 / 0 |
| `samurai` (17) | 8 / ×7.722 / 0 | 14 / ×7.75 / 4 in 4 runs (−44.2 %) | 5 / ×7.722 / 0 |
| `greaterThan` (17) | 7 / ×14.5 / 14 in 9 runs (−6.4 %) | 12 / ×26.1 / 62 in 14 runs (−95 %) | 6 / ×14.5 / 0 |
| `jigsaw9` (17) | 7 / ×5.478 / 1 in 1 run (−5.6 %) | 14 / ×5.478 / 2 in 2 runs (−43.4 %) | 5 / ×5.478 / 0 |

Largest rise with a score below 10 counting as 10 (`out-h2h-summary.txt`). Between positive scores, on their 25: C
×20.597, G16 ×20.625, Gm ×20.597 (`out-h2h-extra.txt`).

### 3.4 The example (`classic9`, expert, 3275974478)

| Replay | Steps | Scores | Rule C | Rule G | Sidecar |
|---|--:|---|---|---|--:|
| Today | 21 | P, 18, 28, 34, 41, 44, 551, 557, 567, 568, —×8, 1849, —, 992 | — | — | — |
| **C** | 7 | 0, 23, 44, 551, 568, 992, 992 | 44 → 551 | 44 → 551, 568 → 992 | 699 B |
| G16 = GA | 16 | 0, 18, 28, 34, 41, 44, 551, 557, 567, 568, 568, 568, 568, 568, 992, 992 | 44 → 551 | 44 → 551, 568 → 992 | 1,728 B |
| Gm | 6 | 0, 36, 44, 551, 557, 992 | 44 → 551 | 44 → 551, 557 → 992 | 561 B |
| Every move | 32 | 0 5 9 12 15 18 20 23 25 27 28 30 31 33 34 36 37 38 40 41 42 43 44 551 557 567 568 568 568 568 568 992 | — | — | 2,799 B |

All keep the one unavoidable leap 44 → 551 (×12.5); none has an avoidable jump on the example. Rating: 1.76 ms for all
moves, 1.36 ms for G16's steps only, 0.22 ms for the two culprit boards. GA adds nothing here (no inner checkpoint
lowers a rise).

### 3.5 Plateaus, small rises and drops

| Replay | Largest rise between positive scores: median / max; runs ≤ ×3 | Flat steps (runs; longest stretch) | Rises under ×1.1 | Drops > 10 % (runs) | Worst drop |
|---|---|---|--:|---|---|
| **C** | ×5.478 / ×40.2; 31 | 11 (9; 2) | 83 | 0 | −6.4 % (Greater-Than expert 1: 1053 → 986) |
| G16 | ×5.914 / ×40.2; 30 | 146 (43; 43) | 560 | 25 (15) | −95.0 % (Greater-Than nightmare 716931706: 2922 → 145) |
| GA | ×5.586 / ×40.2; 30 | 146 (43; 43) | 595 | 25 (15) | −95.0 % |
| Gm | ×5.457 / ×40.2; 29 | 25 (18; 2) | 16 | 0 | none |

A flat step has the same positive score as the step before (the final duplicate excluded). Requirement 2 allows flat
steps ("a table even when the score does not change"); requirement 3 asks for a steady rise, and G16's sequences are
long plateaus broken by jumps: the 60-step `classic9` hell1 replay reads 50 → 2010 ×44 → 2281 → 2377 → 3274, and
Greater-Than nightmare 733709325 reads … 2116, 3042, 2998, 2997, 341, 3827 … 1884, 1891. C shows the same two puzzles
as `0 27 44 50 2010 3274 3274` and `0 0 292 341 1884 1891 1891`, the excursions inside a step whose text names the
peak.

### 3.6 Jump rules on the same steps

On C's 761 steps (`out-rules.txt`): rule C flags 93, rule G 110, both 80. The 13 rises only rule C flags all start from
0 — Greater-Than openings 0 → 115 … 292 — which rule G excludes (score before 0) and which their "first rated puzzle"
label describes better (§3.7). The 30 only rule G flags are all between ×1.5 and ×3: 568 → 992 (example), 585 → 987,
870 → 1572, 103 → 304 → 787 (Killer expert 1), 555 → 836, 135 → 250, 485 → 940, …

Ratios of every rise with a score before above 0 and at least +100 points:

| Ratio | [1.5, 2) | [2, 3) | [3, 3.5) | [3.5, 4) | [4, 6) | [6, 10) | ≥ 10 |
|---|--:|--:|--:|--:|--:|--:|--:|
| C's steps | 13 | 17 | 12 | 7 | 12 | 9 | 40 |
| G16's steps | 12 | 16 | 9 | 7 | 16 | 9 | 44 |

So on C's steps, with a score before above 0 and +100 points: 80 rises of at least ×3, 68 of at least ×3.5, 61 of at
least ×4. The user's own example of a steady rise, 35 → 100 → 300 → 1000, rises by ×2.86, ×3.0 and ×3.33: rule G flags
two of its three steps as jumps (the third only misses +100), my rule C two as well (≥ ×3); only a threshold above ×3.33
leaves it alone.

Avoidable jumps left:

- **C:** 0 under rule C. Under rule G, 4, because C groups rises up to its ratio R (×2.1–×2.6 for these puzzles),
  above 1.5: Classic nightmare 42 870 → 1572 (via 1234), Killer expert 42 555 → 836 (via 599), Classic hell1
  2299986211 2010 → 3274 (via 2281, 2377), Samurai nightmare 2574903663 1445 → 2188 (via 1482). A ×1.5 rule would
  also need a segmentation ratio of at most ×1.5, hence more steps.
- **Gm:** 2 under rule C — Jigsaw nightmare 42 138 → 1678; Classic nightmare 1091277992 587 → 1794 while a move at
  1579 exists (`out-h2h-cases.txt`).
- **GA:** 1 under rule G (Greater-Than nightmare 733709325, where an inserted checkpoint creates a new flagged step) —
  an artefact of my reading of AD2.

### 3.7 Is "cannot be finished without X" true? (the "needed" check)

For every flagged rise, the board after it was solved with only the techniques lighter than its new hardest technique
(`out-h2h-details.txt`):

- C's 93 rule-C jumps: 84 stuck, **9 finished** — all Greater-Than openings (0 → 145 … 292), whose proof uses Naked
  Pair (weight 120, order 60) or Box/Line (50, order 50) although a proof with Inequality Chain (40, order 65) or
  Box/Line exists (scores 127–161): the solver tries the heavier technique first because of its order.
- The 80 rule-C jumps with a score before above 0: **80 stuck**. With the "first rated puzzle" label the strong wording
  would hold for every jump of the corpus — but it remains a statement about this solver (their proof-scope caveat).
- G16's 113 rule-G rises: 110 stuck, 3 finished, all Greater-Than (expert 42; nightmare 683376468, 716931706).
- That Greater-Than scores depend on the solver's order is a rating-calibration observation, outside this research.

### 3.8 The generator's choice sentence (`keep` scores)

For every guided round, the score the digger logged for the chosen candidate (`keep`) against the full rating of the
board after the move: **equal 840, different 0, null 79** (`out-h2h-details.txt`). Null is the objective's "stuck"
value, logged as `score: null` (`digger.js:369–371`), in 15 nightmare runs (`classic9`, `killer`, `samurai`,
`jigsaw9`). My sentence "the other n would have given at most m" is therefore exact when a number exists and needs a
fallback for null.

### 3.9 Cost: rating time and sidecar size

| Item | Measured (Node v24.22.1, 104 requests) |
|---|---|
| Rating every move except the final (needed by C, GA, Gm) | 2,017.8 ms in all; per request median 2.85 ms, max 389.27 ms (Samurai nightmare) |
| Rating G16's displayed steps only | 911.7 ms; median 1.23 ms, max 238.07 ms |
| Longest single non-final rating (27 nightmare and hell1 requests) | 104.36 ms (Samurai nightmare 2574903663), 94.02 ms (Killer nightmare 1445283430), 50.18 ms (Samurai nightmare 2591681282); the other 24 below 14 ms |
| Culprit boards of C's rule-C single-move jumps | 132 ratings, 30.2 ms |
| Moves per request / today's steps | median 32, max 134 / median 13, max 106 |
| Generation, for scale | 93,120.6 ms in all, max 12,505.2 ms |
| Sidecar, every move | median 2,799 B, max 20,069 B |
| Sidecar, displayed steps | C median 839 B, max 1,631 B (85,355 B in all); G16 1,479 / 10,871 B (187,452 B); GA 1,501 / 10,871 B (194,449 B); Gm 584 / 1,185 B (58,805 B) |
| Explanation data per jump | theirs 336–389 B (AD8); mine derived from the same ratings |
| Stored, exported, sent to cache or history | 0 B in all four |

C needs about twice the rating work of G16 (every move instead of every displayed step); in absolute terms it is small.
On phase 1's heavy boards rating every move took up to 0.84 s (`mega16` hell2, CO C7): worker-first is the right place.

### 3.10 Fidelity checks

- On the 26 shared requests (`out-port-check.txt`): G16 equals their trace rows merged by `correctedExisting` (26 / 26);
  Gm equals their `selected` sequences (26 / 26); my move counts equal their atomic counts (26 / 26, 1,437 in all).
- All 104 replays end on the result's givens; 0 of 5,920 moves unrated; every G16 step maps to a move; GA inserted 42
  checkpoints in 19 runs.

---

## 4. Errors found

### 4.1 In gpt-6-astra's report

| # | Claim | Finding | Evidence |
|---|---|---|---|
| 1 | A5 line numbers in `player.js` (GA L220–229) | 6–7 lines early: `RATE_FREE_KINDS` test 517–518 (cited 510–512), final branch 519–521 (513–515), `signs === null` 522–523 (516–517), budget 525 (519), `solved` test 528 (520–522), catch 529–531 (523–525) | source at `8d9510a` |
| 2 | Other ranges | slightly off: clock interval `budget.js:3, 12` (cited 8); re-entrancy `pipeline.js:131–132` (116–130); `WIRE_VERSION` `pipeline.js:258` (247); swap split `player.js:324–338` (322–336); split tests `player.test.js:336–377` (334–376) | source |
| 3 | Which view is the default | stated three ways: "replay complete moves … offer score-aware milestones as a best-effort summary" (L37–41; C3 "recommended minimal correction", L685); "offer a compact milestone view and a detailed complete-move view" (L657); "compact milestones plus optional complete-move details" (L1097) against "the recommended default … is the truthful, complete-move design" (L1104) | GA report |
| 4 | Milestones "aim at 8–12 steps … monotone dynamic programming" (L660, L665) | the prototype is greedy nearest-target (`GA\prototype.cjs:92–109`), 3–8 steps (median 5), within 8–12 in 3 of 104 runs; it skips available checkpoints (2 avoidable rule-C jumps) and mixes phases | §3.2, §3.6 |
| 5 | "Complete moves" (C2 step 2, C3) | the view keeps today's batches (about 9 cells, i.e. 4–5 symmetric groups, per random step; one guided round per step; sign batches) and only merges swaps: it is not a view of moves (their 1,437 atomic checkpoints are). It keeps plateaus (146 flat steps; 44 steps at 2010 in one run) and drops (25 over 10 %, worst −95 %) | §3.5 |
| 6 | AD2 steps 2–3 (insert useful checkpoints; merge plateaus) | not prototyped. Step 2 as I implemented it inserts 42 checkpoints in 19 runs and moves the median largest rise from ×10.745 to ×10.543, leaving plateaus and drops; step 3 is not specified enough to implement | §3.2 |

No arithmetic error was found in the parts I re-checked.

### 4.2 In my report (exposed by theirs or by this head-to-head)

| # | My claim | Correction |
|---|---|---|
| 1 | "After it, the puzzle cannot be finished without {technique}" (`steps.jump.after.new_one` / `_other`, CO L784–785; example L642) | False for 9 of 93 rule-C jumps (all Greater-Than openings; a proof with lighter techniques scores 127–161). Use their "the logical solution now uses X"; add "this solver cannot finish it with lighter techniques" only when that solve was run and got stuck (80 of 80 jumps with a score before above 0). |
| 2 | `steps.jump.formula`: "The work W grows from {wFrom} to {wTo}" (CO L787) | W can fall while the score rises (906.75 → 806.75 in the example's last swap). None of the 74 rule-C jumps of my sample had a falling W, but the sentence must follow the data (their `workDecreased` / `workIncreased`). |
| 3 | "×3 is the rise the user calls steady" (CO L556) and the rule "at least ×3" | The user's steady example rises by ×2.86, ×3.0, ×3.33, so "at least ×3" flags two of its three steps. Revised: at least ×3.5 (§5 #3). |
| 4 | The choice sentence "the other {count} would have given at most {otherMax}" (CO L779) | The digger logs `score: null` for a stuck objective (`digger.js:369–371`): 79 of the 919 chosen guided candidates of the corpus. Needs a fallback; when numeric it is exact (840 of 840). |
| 5 | Optional board highlight of the first use (CO L390, Decision 12) | Misleading: the pattern appears mid-solve (Simple Colouring at proof step 31 of 47, XYZ-Wing at 28 of 52), not on the board shown. Text only. |
| 6 | `steps.jump.smallest`: "… no board in between is easier" (CO L789) | Wrong logic and no scope. Use their scoped statements: "Every subdivision of this change was checked; a large increase remains" only after the subsets were rated, otherwise "one complete symmetric group". |
| 7 | `steps.jump.move.swap`: "This step is a single move of the generator" (CO L771) | A removal and an addition kept in a row look like a swap in the log (`digger.js:1362–1370`); say "removed … and showed … again" unless a tag proves one swap. |
| 8 | Not covered | Position 0 ("Not a puzzle yet"); pending / unrated / ambiguous table states; the proof-scope caveat; the rounding rule (the change shown is the difference of the rounded totals); the cache-hit path (`cache.js:998`); the main-thread pause of one rating, which slices cannot split. |

---

## 5. Revised positions

| # | Topic | My phase-1 position | Revised position | Why |
|---|---|---|---|---|
| 1 | Default granularity | steps chosen by score (C), median 7 | **Keep** | Same largest rise as G16 in 60 of 104 runs, smaller in 41; 11 flat steps instead of 146, no drop over 10 % instead of 25; their own 8–12 target met in 45 runs against 3 for their milestones (§3.2–§3.5). |
| 2 | Details | not proposed ("one step per move" as an alternative) | **Adopt** their two views, as an option: "Show every move" (all positions, true decreases) | The ratings exist anyway; it shows what the generator really did without making the default noisy. |
| 3 | Leap threshold | ×3 and +100, a score below 10 counting as 10 | **Change** → at least ×3.5 and +100 with a score before above 0 for the badge and the full callout; 0 → x is "first rated puzzle" (theirs) | The user's steady example (up to ×3.33) is no longer flagged; 68 jumps on C's steps instead of 93 (13 openings and 12 rises of ×3–×3.5 drop out; §3.6). |
| 4 | Below the threshold | one line for a new hardest technique of 40 points or more | **Merge:** their "New hardest technique" row badge on every new peak plus my one line, worded "now uses" | Both reports want every new peak explained. |
| 5 | Wording | "cannot be finished without" | **Adopt** "the logical solution now uses"; their proof-scope caveat in the disclosure | 9 of 93 false (§3.7). |
| 6 | Callout layout | up to nine visible sentences, first use folded | **Merge:** their heading with the numbers, 2–3 visible sentences, the rest in the "Why this change?" disclosure | Length on a phone (my risk 7, CO D5). |
| 7 | Callout content | move, culprit, choice, before, after, formula, level, why not smaller, first use | **Keep** culprit, choice (with a null fallback) and level change; **adopt** direction-aware W wording, the "empty cells unchanged" sentence, scoped split statements, proof scope; first use as text | §3.7–§3.8, AD4. |
| 8 | Board marks | culprit frame `cause`; optional first-use highlight | **Keep** the culprit frame (a clue of the board shown); **drop** the first-use highlight | AD4: the pattern is mid-solve. |
| 9 | Where to rate | page slices after `load`, 1,000,000 checks | **Change** → a worker job after `done` in a pure generator module, page slices as the fallback (`file://`), deterministic work guard; Pending state meanwhile | One rating (up to 104 ms in Node) cannot be sliced (§3.9). |
| 10 | Swap wording | "a single move of the generator" | **Adopt** their caution | The log cannot tell a swap from a removal followed by an addition. |
| 11 | Position 0, structure steps | a total-0 table | **Adopt** "Not a puzzle yet" at position 0 and their explicit states | Contains mine. |
| 12 | Decreases | dips ≤ 10 % with a line; excursions folded with a peak sentence | **Keep** in the summary; **adopt** their drop texts and data-driven direction in the details view | §3.5. |
| 13 | Tests | `player`, `steps`, `i18n` | **Merge** with theirs (stale worker replies, cache path, zero solver calls on a language change) | GA D5, AD9. |

---

## 6. The converged proposal

### 6.1 Data and computation

1. After `done`, a job in the worker (in the page, in slices, when no worker runs) replays the dig log move by move —
   random and guided accepts, a removal and an addition kept together (one change), refinement reveals, Greater-Than
   clues and sign accepts, restarts — in a pure module owned by the generator (for example
   `generator/js/engine/replay.js`), listed in the generator's `index.html`, `tests.html`, `tests/node-runner.js` and
   `js/worker/gen.worker.js` (`ui-contract`).
2. Every position is rated once: `SG.difficulty.rate` with a work guard (no wall clock); Greater-Than with its alive
   signs; the final from `result.rating`; the solution, cages and signs at 0; a DFS confirmation when the proof assumed
   uniqueness. An unrated or ambiguous position can only appear in the details view (none in 5,920 moves).
3. The result, cache, history, export, keys, regression hashes and qualification lists do not change. The ratings live
   in memory (≤ 20 KB per puzzle), are dropped with the puzzle and recomputed after a cache hit (`app.attachTrace`).

### 6.2 Steps

- **Summary (default):** my C4 rules unchanged — a move that rises by ×R or more is a step of its own; phases end
  steps; geometric fill at `R = clamp((max(S_final, 10) / 10)^(1/6), 1.3, 3)`; a step that gains less than 10 points
  joins the next one unless a phase or a leap ends it; dips ≤ 10 %; excursions folded with a "peak" sentence; the
  finished puzzle last; structure steps kept.
- **Details (option, Decision 2):** every move, every true decrease.
- The finished puzzle and its table show at once; the replay controls wait for the job ("Preparing the steps… k of N").

### 6.3 A table on every step

States: Rated; Score 0 (solution, cages, signs); Pending; and, defensively, Unrated / Ambiguous / Unavailable (never on
a summary step). Position 0 is not a step: today's hint stays, and a kept container reads "Not a puzzle yet". A table is
never copied from another step.

### 6.4 Explaining rises, leaps and drops

| Change | What the step shows |
|---|---|
| Any | the change in the Total and the Score column ("551 (+507)"); Before / After / Change in the Total's tip |
| 0 → first positive score | "First rated puzzle", and the technique the solution uses |
| New hardest technique, below the threshold | row badge "New hardest technique" and one line "The logical solution now uses X (w points per use): a → b" |
| **Leap**: at least ×3.5 and +100, score before above 0 (Decision 3) | heading badge "Score jump ×r"; the cause row highlighted; the culprit clue framed; callout "Why the score increased: a → b (+d)" with, visible, the move and its clues, the culprit, the new hardest technique (weight, uses) and the one before; in the disclosure, the P / R / V terms (W wording by direction), the round's alternatives (or the null fallback), the level change, the split scope, the proof scope, the first use as text |
| Dip ≤ 10 % (summary) | one line: "The score goes down a little …" |
| Decrease (details view) | their drop texts (refinement / proof changed), the direction from the data |
| Change of signs only (Greater-Than) | "Removed inequality constraints: …" and `constraintProof` |

### 6.5 Strings (`SG.i18n.t()`, English and Vietnamese)

| Purpose | Mine (CO D2) | Theirs (GA D2, AD6) | Converged |
|---|---|---|---|
| Leap badge in the heading | `steps.jump.badge` | — | mine, only above the threshold |
| Callout heading | `steps.jump.title` | `steps.jump.heading` | theirs (numbers in it, neutral at any threshold) |
| What changed | `steps.jump.move.group / cell / swap / sign / clues / peak` | `steps.jump.removed / exchanged / signsRemoved`, `steps.jump.clue` | mine per move kind with their `{symbol} at {cell}`; the swap without "single move" |
| Culprit | `steps.jump.culprit / together / parts` | `steps.jump.splitWitness` | mine (three cases; theirs is the first) |
| Generator's choice | `steps.jump.choice_one / _other`, `steps.jump.random` | — | mine, plus `steps.jump.choice.unscored` for null `keep` scores |
| Technique before / after | `steps.jump.before.*`, `steps.jump.after.*` | `steps.jump.peak / peakChange / peakReplaced` | their "now uses" wording, my plural forms and "before" sentence |
| Formula | `steps.jump.formula` | `steps.jump.contributions / empties / emptiesUnchanged / workDecreased / workIncreased` | theirs (each sentence follows the data) |
| Level change | `steps.jump.level` | — | mine |
| Split scope | `steps.jump.smallest` | `steps.jump.splitChecked / splitLimited` | theirs |
| Proof scope | — | `steps.jump.proofScope` | theirs |
| First use | `steps.jump.firstUse` (+ the solver's `technique.<id>.step*`) | — | mine, text only, folded |
| Disclosure | — | `steps.jump.more` | theirs |
| First rated puzzle | `steps.jump.before.none` | `steps.jump.firstPuzzle` | theirs as the label; my Greater-Than opening sentence |
| Row badges | `steps.techniques.new`, `steps.techniques.cause` | `steps.jump.newPeak` | theirs on every new peak; mine ("causes the jump") on a leap |
| Rise below the threshold | `replay.rise` | `rating.jump` | mine, worded "now uses" |
| Decreases | `replay.dip`, `replay.peak` | `steps.drop.*`, `rating.tuning` | mine in the summary, theirs in the details |
| Table states | `steps.preparing` | `rating.pending / zero / unchanged / unrated / nonunique / timeout / previous` | theirs, with my progress count |
| Board legend | `steps.legend.cause` | — | mine |
| Views | — | `replay.milestones`, `replay.details` | theirs, if Decision 2 (a) |

New key `steps.jump.choice.unscored` (draft): EN "{count} of them were too hard for the generator's quick check to
finish." — VI "{count} cách trong số đó quá khó để bước kiểm tra nhanh của trình sinh đề giải xong."

### 6.6 The example, before → after

- **Today:** `P, 18, 28, 34, 41, 44, 551, 557, 567, 568, —×8, 1849, —, 992` (21 steps, 9 without a table besides
  step 1's sentence).
- **Converged summary:** `0, 23, 44, 551, 568, 992, 992` (7 steps, all with a table). Step 4 (44 → 551, ×12.5) gets the
  leap badge and callout; step 6 (568 → 992, ×1.75, +424) gets the "New hardest technique" badge on XYZ-Wing and the
  one line (under rule G it would also get the callout: Decision 3).
- **Details (option):** the 32 positions `0 5 9 … 43 44 551 557 567 568 568 568 568 568 992`.

Step 4, visible part (English):

```text
Step 4 – Hardest removal                                                     [ Score jump ×12.5 ]
2 removed · 36 clues left · score 551 (+507)
Rate 15 possible removals (5 refused) and remove the one that makes the puzzle hardest: R1C2, R9C8.
Why the score increased: 44 → 551 (+507)
Removed 3 at R1C2 and 1 at R9C8, a symmetric pair; removing 3 at R1C2 alone already gives 550.
The logical solution now uses Simple Colouring (360 points per use; 2 uses); before, singles were enough.
▸ Why this change?
    P 1 → 360 (+359); W 43 → 768.25, so R 1.4 → 148.3 (+147.0); E 43 → 45, so V 41.4 → 42.4 (+0.9).
    In this round the other 9 possible removals would have given at most 45; at this level the generator
    keeps the one that makes the puzzle hardest. Very easy → Hard in one step.
    Every subdivision of this pair was checked; a large increase remains.
    This describes the generator's logical solution, not every way a person could solve the puzzle.
    First use: Simple Colouring on 3 (colour trap) … (the solver's own sentence)
Table: Simple Colouring "New hardest technique · causes the jump"; Total 551 (+507).
Board: R1C2 framed "Removing this clue causes the jump"; R9C8 framed "Removed in this step".
```

Vietnamese (visible part):

```text
Bước 4 – Xóa ô làm đề khó nhất                                               [ Điểm tăng vọt ×12,5 ]
Vì sao điểm tăng: 44 → 551 (+507)
Bỏ số 3 ở R1C2 và số 1 ở R9C8, một cặp đối xứng; chỉ bỏ số 3 ở R1C2 cũng đã cho 550 điểm.
Lời giải logic hiện dùng Tô màu đơn giản (Simple Colouring) (360 điểm mỗi lần; 2 lần); trước đó chỉ cần
các kỹ thuật số đơn.
▸ Vì sao có thay đổi này?
```

Step 6, one line: EN "The logical solution now uses XYZ-Wing (750 points per use) instead of Simple Colouring (360):
568 → 992." — VI "Lời giải logic hiện dùng XYZ-Wing (750 điểm mỗi lần) thay cho Tô màu đơn giản (Simple Colouring)
(360): 568 → 992." Its tip: P 360 → 750, W 906.5 → 806.75, R 163.3 → 197.5, V 44.8 unchanged.

### 6.7 Documents and quick tests

- Documents (same change, both languages): `generator/design.md` §7.1, §7.3, §10.5, §15.2; `USERGUIDE.md` /
  `USERGUIDE.vn.md`; `DEVELOPERGUIDE.md` / `DEVELOPERGUIDE.vn.md`; the Help text `help.generation.replay`
  (`generator/js/ui/help.js:1183, 1444`); `generator/task.md` (later-change notes).
- Quick tests only (`cd generator && node tests/node-runner.js --suite=player,steps,i18n`, plus `worker`, `cache`,
  `ui-contract` when those parts change): the example gives `0, 23, 44, 551, 568, 992, 992` with one leap at step 4; a
  swap is one change and no half-swap board appears; every summary step ends on a unique, completely rated position;
  no shown drop over 10 %; the leap callout names R1C2, Simple Colouring, 360, 2 uses, P 1 → 360, Very easy → Hard;
  "now uses" wording, W wording by direction, the null `keep` fallback; Greater-Than alive signs and sign-only changes;
  Samurai global cells; stale worker replies ignored; no solver call on a language change; both languages for every
  key. The `player.test.js` tests tied to fixed batch sizes (lines 223, 240, 311, 336, 354) are rewritten around these
  invariants, not weakened; no heavy suite, fixture or hash changes.

---

## Appendix X — Experiments of this phase (all under `CO\xreview\`)

The scripts load `generator/` and `core/` read-only through `CO\lib.js` (the `SOURCE_FILES` order of
`generator/tests/node-runner.js`) and `CO\moves.js`, read `GA\` read-only, and write only to standard output.

### X1. Scripts and outputs

| Script | What it does | Output |
|---|---|---|
| `config-check.js` | my page configuration against their `request()` for 4 requests; shape of `SG.player.buildSteps` | standard output (SAME × 4) |
| `passes.js` | dig-log pass of the jump moves my phase 1 calls random (4 requests) | standard output |
| `h2h.js` | the head-to-head: 104 requests, every move rated, C / G16 / GA / Gm, metrics, "needed" check, `keep` fidelity | `out-h2h.jsonl` (104 lines), `out-h2h.err` (empty) |
| `h2h-summary.js` | §3.2–§3.3 tables, cost, checks, the four sequences of every request | `out-h2h-summary.txt` |
| `h2h-extra.js` | rises between positive scores, flat steps, rises under ×1.1, drops over 10 % | `out-h2h-extra.txt` |
| `h2h-details.js` | the "needed" cases and the `keep` fidelity | `out-h2h-details.txt` |
| `cases.js` | the runs where C has more steps than G16 (Samurai veryEasy); the avoidable jumps of C, Gm, GA | `out-h2h-cases.txt` |
| `ga-claims.js` | their AD3–AD4 claims re-run (swap subsets, witnesses, lighter-only solves) | `out-ga-claims.txt` |
| `example-details.js` | every-move scores of the example; counts of its 568 positions; longest single rating on 27 high-level requests | `out-example-details.txt` |
| `port-check.js` | G16, Gm and move counts against their own files (26 requests) | `out-port-check.txt` |
| `rules.js` | rule C against rule G on the same steps; ratio bins; ×3 / ×3.5 / ×4; the 8–12 band | `out-rules.txt` |
| `maxrise.js` | largest rise per run, replay against replay; worst drops | `out-maxrise.txt` |

### X2. Commands (run from `CO\`)

```text
node xreview\config-check.js
node xreview\passes.js
node xreview\h2h.js > xreview\out-h2h.jsonl 2> xreview\out-h2h.err      # 104 requests, 96 s
node xreview\h2h-summary.js > xreview\out-h2h-summary.txt
node xreview\h2h-extra.js > xreview\out-h2h-extra.txt
node xreview\h2h-details.js > xreview\out-h2h-details.txt
node xreview\cases.js > xreview\out-h2h-cases.txt
node xreview\ga-claims.js > xreview\out-ga-claims.txt
node xreview\example-details.js > xreview\out-example-details.txt 2> xreview\out-example-details.err   # 20 s
node xreview\port-check.js > xreview\out-port-check.txt
node xreview\rules.js > xreview\out-rules.txt
node xreview\maxrise.js > xreview\out-maxrise.txt
```

Seeds: the example; their `GA\sample.json` (seeds 1 and 42); my phase-1 `CO\out-sample.jsonl`. No test suite was run.

### X3. Raw results quoted

```text
out-port-check.txt     requests 26; G16 identical 26; Gm identical 26; move count identical 26; total moves 1437
out-rules.txt (C)      rule C 93 (from 0: 13), rule G 110, both 80, rule G only 30
                       bins [1.5,2) 13; [2,3) 17; [3,3.5) 12; [3.5,4) 7; [4,6) 12; [6,10) 9; >=10 40
                       x3 80, x3.5 68, x4 61; runs with 8-12 steps: C 45, G16 43, GA 39, Gm 3 of 104
out-maxrise.txt        C vs G16 equal 60, C smaller 41, C larger 3; C vs Gm 57 / 32 / 15
                       worst drop C 1053 -> 986 (-6.4 %); G16 2922 -> 145 (-95.0 %); Gm none
out-example-details    32 positions; 568 positions NS 29/30/30/31/28, HSB 22/21/21/20/23
                       longest single non-final rating 104.36 ms (samurai nightmare 2574903663, reveal)
out-h2h-details.txt    needed (C, rule C): stuck 84, lighter 9 (all greaterThan openings, 127-161)
                       keep: equal 840, different 0, null 79
out-ga-claims.txt      last swap R4C2 R6C8 out, R1C8 R9C2 in, 568 -> 992; 16 subsets unique 16 rated 16
                       distinct 47 517 553 554 568 569 992 1167 1680 1849
                       Simple Colouring digit 3 at cells 37, 65, step 31 of 47; XYZ-Wing pivot R6C3, step 28 of 52
                       lighter than 360 (step 7): stuck; lighter than 750 (final): stuck
out-h2h-summary.txt    §3.2-§3.3 and §3.9 tables, verbatim; ends on the puzzle 104/104; unrated 0 of 5920
```

### X4. Repository integrity

- `git status --short` at the start of this phase: `?? docs/generation-steps/`; with `-uall`: the two `1-report.md`
  files.
- At the end (after writing this review), `git status --short`: `?? docs/generation-steps/`; with
  `-uall -- docs/generation-steps`:

  ```text
  ?? docs/generation-steps/claude-opus-5.5/1-report.md
  ?? docs/generation-steps/claude-opus-5.5/2-review-of-gpt-6-astra.md
  ?? docs/generation-steps/gpt-6-astra/1-report.md
  ?? docs/generation-steps/gpt-6-astra/2-review-of-claude-opus-5.5.md
  ```

  The last file is gpt-6-astra's own review, written in parallel; it was not read for this review.
  `git diff --name-only` is empty; HEAD is still `8d9510a`.
- No file outside `docs/generation-steps/claude-opus-5.5/` was created or changed; nothing in `GA\` was modified; no
  commit, stash or index change; no heavy test, hash update or browser script was run.

---

## Decisions for the user (merged)

**Settled by the user at 13:54** (both reports apply them):

| # | Decision |
|---|---|
| S1 | Scores stay the real ratings of real boards: no smoothed or interpolated number in the table. |
| S2 | A jump that no grouping or splitting of steps can remove is accepted. |
| S3 | The page must explain, on the step itself, why the score jumped. |
| S4 | Following from S1–S2: no synthetic "progress" number and no separately generated ladder in place of the replay. |

**Agreed by both researchers** (no decision needed unless the user objects):

| # | Point |
|---|---|
| A1 | A local-search swap is shown as one change; the half-swap boards (2 solutions) and the 1849 disappear. |
| A2 | Every step has a table, also when the score is unchanged; the solution, cages and signs steps a table with total 0; the finished puzzle stays the last step with the Summary's table; a table is never copied from another step. |
| A3 | A symmetric group is never split to soften a rise; its partial boards only name the clue that causes it. |
| A4 | Nothing is stored or exported; the generator, its log, its caps, the regression hashes, the qualification lists and the cache keys do not change. |

**Open** (recommendation first):

| # | Question | Options and evidence | Recommendation |
|---|---|---|---|
| 1 | Default granularity | (a) steps chosen by score, median 7 (CO); (b) today's batches with swaps merged, median 13, up to 60 (GA "complete moves"); (c) greedy milestones, median 5 (GA prototype) — §3.2–§3.5 | (a) |
| 2 | Details view of every move | (a) an optional "Show every move" toggle (GA's idea; the data is there); (b) none; (c) as the default | (a), or (b) for a smaller first change |
| 3 | Which rises get the "score jump" badge and the full callout | (a) at least ×3.5 and +100, score before above 0: 68 on C's steps (CO revised); (b) ×3 and +100: 80 plus 13 openings (CO phase 1); (c) ×1.5 and +100: 110 (GA), which also needs a segmentation ratio of at most ×1.5, hence more steps — §3.6 | (a); in every option each new hardest technique gets the row badge and one line, and 0 → first puzzle reads "first rated puzzle" |
| 4 | Callout length | (a) heading with the numbers, 2–3 visible sentences, a "Why this change?" disclosure; (b) everything visible (up to nine sentences); (c) one line and the tip only | (a) |
| 5 | The generator's choice ("the other 9 candidates of this round would have given at most 45") | (a) include, with a fallback when the digger logged no score (79 of 919); (b) leave out | (a) |
| 6 | First use of the new technique | (a) as text, folded; (b) leave out; (c) later, a separate proof-state view — never a highlight on the board shown | (a) |
| 7 | Decreases in the default view | (a) dips ≤ 10 % shown with a line, larger excursions folded with a "peak" sentence (C: 17 dips, worst −6.4 %); (b) strictly non-decreasing (Gm); (c) every decrease (G16: 77, worst −95 %) | (a); (c) only in the details view |
| 8 | Where to rate | (a) a worker job after `done`, page slices as fallback (both researchers now); (b) the page only (CO phase 1); (c) scores logged by the digger (changes the engine's log) | (a) |
| 9 | Phases end steps even when the score barely moves (example 551 → 568) | (a) yes; (b) merge into a neighbour (mixed titles) | (a) |
| 10 | Marks for the jump steps on the step slider | (a) not at first; (b) yes | (a) |
