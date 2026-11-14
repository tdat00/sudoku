# Rating v3: clarifications for the plan author

Open questions for the plan author (claude-fable-5-2). Only questions that still need the plan author's answer
are kept here. Every answered question and owner decision is in
[clarifications-resolved.md](clarifications-resolved.md) with its id and part letter unchanged: Parts A to H,
PR-S1, CV6-03 and CV6-04, and the current owner-decision register S-OD1 to S-OD5. When a question here is answered,
it moves there unchanged.

How to answer: write the answer under the question's **Plan-author answer** line.

---

CV6-04's complete question and answer have moved
unchanged to the resolved archive. CV6-04 corrects (c2)'s wording: an unmarked legacy 8 means default
on every board. The approved MS05r5p legacy-8 migration fix round is implementation, not an open decision.
PR-S1 and CV6-03 are also archived. S-OD4 still governs the resumed task pack; S-OD5 requests the
non-blocking review below and reserves the machine after Pentomino's MP12b1 until Sudoku reaches MS07e.
Possible later decisions (Killer calibration at MS07e, or a changed cap/window choice at MS18b) are named
in their owning tasks; they are not unanswered prerequisites for MS05r5p.

---

## PR-S2: Time-complexity review of the generator

**Raised by the orchestrator at the owner's request, 2026-11-14 07:15 (+07:00).
Answer requested from Fable (plan author).**

**Non-blocking: work continues while this review is open.** MS05r6a is running; this request does not
pause Sudoku or authorize a developer to change the remaining algorithms, caps, scope or budgets.
The owner's separate scheduling decision is recorded as **S-OD5** in the resolved archive:
Pentomino pauses after MP12b1 until Sudoku reaches MS07e, so Sudoku runs without lock contention.

### Review basis

- [Generator state and time complexity, 2026-11-14](generator-state-2026-11-14.md): a self-contained
  trace of the pipeline, operational cost model, recorded timings and outstanding performance facts,
  with projections separated from measurements.
- The code at the pushed review snapshot **`1d191019bc718431d237a97fd57056865af08d20`** (`1d19101`),
  `refs/dv3-wip/MS05b3-done-20261114-0705`. Use `git show 1d19101:<path>`, not the moving working
  tree. This snapshot includes MS05b3 and the legacy-8 fix; it is step evidence, not acceptance.
- The document links MS02, MS05r1/r4/r5p/r5m and MS05b3 evidence, including all 171 generated
  I5/CV3 cell distributions, the 325 s Jigsaw request, Greater-Than Normal's p95 and S-AV01-S-AV13.
  No new test, generation or timing run was made to raise this question.

### Questions for the plan author

1. **Review the time complexity of the current generator.** In particular, judge the attempts/samples/
   logical-oracle/rating/DFS composition, the work not covered by the full-rating or shallow allowance,
   requiredness-driven retries, the large-board costs against the 30 s qualification and 120 s app
   contracts, and the observed tail/no-hit cells. Say where the cost model needs correction or what
   conclusion the present evidence does not support.
2. **Should the remaining tasks, MS05e through MS18e, change because of that review?** If yes, identify
   the affected task IDs and the concrete algorithm, bound, sequence or validation amendment, its
   rationale and any change to a recorded decision that needs the owner's approval. If not, confirm
   the existing route with the performance findings carried to their present owners. Do not treat
   projections of future technique costs as measured results.

### First affected work

The answer would first affect **MS05e** if the guided-sign repair or its cost assumptions should change,
then **MS06** for the target policy across digging/refinement/local search. It may also affect MS07's
chain/Hell 1 work, S3 finder-cost controls and the MS17b/MS18b freeze/recheck route. Until an answer is
recorded, the current tasks continue: no implicit new sample cap, weight change, scope deferral, larger
budget or qualification exception is authorized.

**Plan-author answer (claude-fable-5-2, 2026-11-14).** I read the state report in full and checked its anchors in
`digger.js`, `difficulty.js`, `logical-solver.js`, `dfs-solver.js` and the worker client at `1d19101`. I ran no
generation, test or timing. Short version: the report's cost model is right in structure and misses the two
quantities that explain the numbers; the remaining tasks MS05e to MS18e **do not change**; a faster generator is
a separate feature after rating v3 is frozen, described in
[docs/improve-generating/plan.md](../improve-generating/plan.md) and **not** to be implemented now.

**1. Review of the time complexity.**

*What the report establishes, and I accept.* The decomposition of section 3; that `CAP_RATINGS` and the 256
allowance bound only canonical ratings; that the ordinary samples carry the large-board cost (97.0 of 107.2 s on
mega16 seed 3, with only 95 canonical ratings in them); that requiredness changed when a search stops, not what a
check costs; the four pieces without a local ceiling (the full-grid search after its 50th restart,
`secureUniqueness`, the Greater-Than sign checks, `buildJigsaw` outside the budget).

*Corrections to the cost model.*

1. **The number of oracle solves per sample does not depend on the board.** With G about N/2 groups and
   `B(N) = clamp(round(32 * 81 / N), 4, 32)`, Stage B evaluates about `G * B = 1,296` candidates per sample on every
   board from 81 to 648 cells, plus G in Stage A. The pool was scaled to hold this constant. So the growth with the
   board is entirely the cost of **one** solve.
2. **One solve is `d * sum F_i`, not a unit.** `iterate` restarts the ladder at its first technique after every
   effective deduction and every finder scans the whole grid; d (deductions) grows with N and the finders with
   N * q or faster. The measured per-sample time is about 4.0 s on mega16 against about 0.05 s on classic9: 80
   times for 3.2 times the cells. The report's formula should carry this term; "at most G * B(N) evaluations"
   hides that each evaluation is a complete logical solve from the givens.
3. **Hardness is paid repeatedly.** Once an accepted removal makes the puzzle need a chain, every later oracle
   solve of that sample runs the chain finders again. This, not the canonical ratings, is the Nightmare cost.
4. **The model has no probability in it.** The expected time to a hit is (cost of a sample) / (probability that a
   sample is exact), cut off at A * S samples. The per-sample hit probability is recorded nowhere; only hits per
   request are. A cell with 0 hits runs a fixed amount of work, so its "p95" is a constant of the ceilings: mega12
   Nightmare at 23.5 to 25.2 s is not "inside 30 s", it is the full work of four attempts that never succeed.
5. **Wall time equals work.** Generation runs in one worker. Nothing in the pipeline is parallel, and a request
   that times out returns nothing although the keeper may hold a valid puzzle.

*What the present evidence does not support.*

- That 256 is a time-optimal allowance (one cell, a 5 % lower median of a count); unchanged from my PR-S1 remark.
- Any statement about Hell 1 or Hell 2 cost: their tiers are empty at this snapshot.
- That the Jigsaw tail is rare or belongs to a stage: one request of 20, no profile. With one event in 20 the
  rate could be anything up to about one in five.
- That the app completes what Node completes: 116.9 s synchronous Node with trace off is not a browser result
  under a 120 s guard. I expect mega16 Nightmare to fail in the app today.
- That any cell with 2 or 3 CV3 requests has a known hit rate.
- Conversely, the evidence does **not** show that these cells are unreachable: mega16 seed 3 hit at attempt 6.
  The puzzles exist; the search is slow to find them.

*Judgement.* Against the 30 s qualification budget, mega16 Nightmare fails by a factor of 3 to 4 and cannot be
tuned into it with the present search; mega12, samurai, sohei, butterfly and flower Nightmare fail on hits, not
time; Killer Hard to Nightmare fail on hits and are, as I said in PR-S1, a weight question first. The search is
blind to requiredness (it maximises the score and waits for the tier to appear), each probe is a from-scratch
solve, and there is one thread. Those three are what a real improvement has to change, and all three alter
generation results or the worker architecture.

**2. The remaining tasks MS05e to MS18e: no change. The existing route is confirmed.**

- **MS05e** proceeds as written. Its cost assumption (the pool reuses solves the oracle already makes) holds, and
  the fixed pool comparison stays under S-OD1.
- **MS06** proceeds as written. Its `tierUsed` preference is the right first step towards a requiredness-directed
  search and costs no extra solve; I expect it to raise hits somewhat and not to change the time of failing
  requests. That is a projection.
- **MS07 to MS16** proceed. New finders make every failed search dearer and can make hits commoner; the direction
  is not known. For that very reason the search should not be redesigned before the catalogue is complete: the hit
  probability it would be tuned against is still moving.
- **MS17b, MS18b to MS18e** proceed. MS18b's possible sample-level bound stays its own proposal with data, as
  decided. No new cap, budget, scope deferral or qualification exception is authorised by this answer.
- **Outcome to expect, by the existing rules, not a new decision:** cells that miss 36 of 40 exact hits or their
  p95 at MS18c are not offered. On present numbers that is likely for mega16 Nightmare and possible for the other
  large-board Nightmare cells. That is the honest v3 release state; the improvement feature is what brings them
  back.

*Carried findings, with their present owners.* S-AV01 to S-AV13 stay routed to MS07e and MS18c / MS18d. Three
remarks for those owners, none of which changes a task's scope:

- S-AV11 (Jigsaw 325 s): when MS18d measures performance, that single request deserves a stage profile; its
  cause decides which unbounded piece is guarded later. Until then, do not describe it as a dig cost.
- S-AV03 (mega16): record it as failing the 30 s budget by its work ceiling, not as a tail.
- Where MS07e and MS18d already write per-request records, the existing `stats` counters (samples, attempts,
  `oracleCalls`) are worth keeping in them: they are the baseline the improvement feature will be compared with.

*Deferred to the later feature (not now, owner's instruction).* The plan proposes, with a measurement phase and
gates before anything is built: a frontier dig that descends on the floor techniques and crosses the requiredness
frontier deliberately (about ten times fewer full solves per sample, and cheap failures); an early exit of
removal tests; an event-driven ladder that gives byte-identical ratings; a worker pool with ordered consumption
(attempts in parallel without changing any puzzle); an anytime result at the time guard; ceilings for the
unbounded pieces; idle pre-generation; and, if the owner wants a guarantee for the rarest cells, a seed bank
with validity-preserving transformations. It needs its own generator version after MS17b's freeze and three owner
decisions listed there. None of it is authorised by this answer.
