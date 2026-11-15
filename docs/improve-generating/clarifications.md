# Improve generating (Sudoku): questions for the plan author

Merged and deduplicated from the two analysts' questions (IG-S-OPUS-Q1 to Q12, IG-S-ASTRA-Q1 to Q8) and from the joint
report ([report.md](report.md)). Questions that block starting the feature come first (IG-S-Q01 to IG-S-Q07). Each gives
the question, why it matters, the options and the analysts' recommendation; where Opus (SA1, claude-opus-5.5) and Astra
(SA2, gpt-6-astra) differ, both views are given. Nothing was run to prepare these questions. IG-S-Q16 rests on the MS05e
evidence committed in `ef8a9cc` after the analyses (paths in the report's §7); Opus read it, Astra did not review it.

---

## IG-S-Q01: Where the generator-algorithm version lives, and what happens to existing history entries

*Blocks: phase 3 (S1, S2, S5b), S6 and any S7 change. From: IG-S-OPUS-Q7, IG-S-ASTRA-Q6.*

**Question.** OD-S1 proposes a new generator-algorithm version whose old recipes "keep their stored puzzle". Where is
the version recorded, and what does a history entry that has no stored puzzle do after the switch?

**Why it matters.** No generator-algorithm version exists today: history stores the configuration, seed and summary
only (`generator/js/ui/history.js:19-23`), the cache key has no algorithm, the wires are version 1, and the 20-entry
evictable cache (`generator/js/ui/cache.js:49`) cannot back the 100-entry history (`history.js:20`). After S1, the same
seed gives another puzzle; after S6, a result can depend on the device.

**Options.** (a) Keep the old search path selectable for old entries, indefinitely. (b) History version 2 stores the
puzzle and its provenance; version-1 entries regenerate on the new path with a notice. (c) Materialise existing entries
(generate and store their puzzles) once, before the switch.

**Recommendation.** Both analysts: decide before phase 3, and state it in the design. Opus prefers (b). Astra: any of
(a) to (c) is acceptable if stated explicitly; "old recipes keep their stored puzzle" cannot be the answer, because no
puzzle is stored today.

Plan-author answer: **(b), shipped one phase before the switch. Owner to confirm (user-visible).**

- The report is right: "old recipes keep their stored puzzle" (OD-S1) was wrong, because nothing is stored
  (`history.js:21-22` keeps the configuration only). OD-S1 is reworded accordingly.
- Add one integer `generatorVersion` (today's search = 1). It goes into: the history entry, the cache key, the wire
  (wire version 2) and every exported recipe. It is separate from the rating version, the bank version and the stock.
- History version 2 stores the puzzle (givens, solution, variant structure) and its provenance (`generatorVersion`,
  rating version, `exact`, later `timed` and bank id). Picking a v2 entry shows the stored puzzle and never regenerates.
  Size is not a problem: at most 100 entries of a few hundred characters each.
- **Ship history v2 and the version field in phase 1**, while the search is still version 1. It changes no puzzle, and
  every entry made from then on survives the switch.
- A v1 entry (no stored puzzle) regenerates on the current path and shows a notice that it was made by an older
  generator and may differ. No bulk materialisation (c): 100 Nightmare entries on large boards would cost minutes to
  hours of background work for little value.
- Not (a): two production search paths double the regression surface for ever. The version-1 path stays only behind a
  test switch for SM2's comparison and is deleted after phase 3's qualification.

---

## IG-S-Q02: What qualification measures once there is a pool

*Blocks: phase 2's gate. From: IG-S-OPUS-Q6, IG-S-ASTRA-Q5.*

**Question.** Does the 10 s (81 cells) and 30 s (larger boards) p95 budget mean serial single-thread Node time, or the
wall time of one request on the production pool; with which worker count and which `--jobs`? Does OD-S2 also change the
120 s guard from active generation time to request wall time?

**Why it matters.** `generator/tests/qualify.js` runs the pipeline synchronously in `--jobs` processes (half the logical
processors), so S5 changes no verdict unless the protocol changes; a pooled run with 8 jobs would oversubscribe 16
threads. Only S5's contribution depends on this protocol: kernel work alone might bring Greater-Than Expert's p95
(14.2 s today) under 10 s in some scenarios, while Nightmare's serial projections (from 19.2 s) still miss it. The app's
guard counts active worker time today.

**Options.** (a) Serial, as today: the pool helps users but changes no qualification verdict. (b) Pooled wall time per
request with a fixed width (for example 4) and `--jobs` reduced so the machine is not oversubscribed. (c) Report both and
qualify on (b).

**Recommendation.** Both analysts: (b), reported with (a) beside it (c); decide the guard's meaning together with OD-S2.

Plan-author answer: **(c): report both, qualify on pooled wall time. Owner to confirm the guard's meaning.**

- Qualification verdict: wall time of one request on a pool of fixed width 4, with `--jobs` reduced so that
  jobs x 4 does not exceed the physical cores. The serial figure is reported beside it and stays the regression
  control for phases that claim equal results (a serial slowdown is a failure even if the pooled time passes).
- The serial `file://` lane keeps working but is not what the offer is qualified on; the design must say so, and the
  time guard covers it.
- Guard: with a pool, "active generation time" has no single meaning. I recommend that the 120 s guard become the wall
  time of the request from its start (what the user waits). This is decided together with OD-S2.
- Until S5a exists, nothing changes: phase 0 measures serially.

---

## IG-S-Q03: S3 and S10 identity under budget checks

*Blocks: phase 1's equal-result claim. From: IG-S-OPUS-Q4, IG-S-ASTRA-Q3.*

**Question.** Must S3 (and S10) preserve the existing budget-check charges and cap boundaries exactly, or may that part
move under the new algorithm version?

**Why it matters.** Finders call `ctx.check()` inside their scans; `OBJECTIVE_STEPS` (100,000;
`generator/js/engine/digger.js:659, 711-728`) and Killer's layout-rating slices (`ANALYSIS_NODES`,
`generator/js/variants/killer.js:469, 483-490, 836-854`) count those calls, so skipping clean scopes can turn a capped
search into a completed one and change the puzzle while the unlimited traces stay equal. S10's DFS kernel also reaches
the DFS guards (`UNIQUE_NODES`, `REPAIR_NODES`), which S3 does not.

**Options.** (a) Virtual checks: charge, per skipped scope, the checks the full scan would have made, so phase 1 keeps
equal results. (b) Move the guards to a unit S3 preserves (applied steps, deductions) as part of the new version; S3 then
moves to phase 3. (c) Show on the corpus that no guard binds: not sufficient, since other seeds still change.

**Recommendation.** Both analysts: (a) for phase 1, otherwise (b); SM4 compares the check sequence and the failure
boundary, not totals only.

Plan-author answer: **(a) for phase 1, per finder family; a family that cannot do it moves to phase 3 under (b).**

- The plan's "byte-identical" claim covered the step trace only and missed the budget counters. Accepted.
- Suggested mechanism for the architect: a clean scope has an unchanged footprint, so a rescan would make exactly the
  checks of its last scan. Store that count per scope when it is scanned and charge it when the scope is skipped. The
  charge is O(1) and exact, and the cap is crossed inside the same scope as today.
- Proof obligations: (1) each finder's `check()` count depends only on its footprint; (2) no handler of the budget
  error reads partial state from the interrupted scan. A family that fails either stays a full scan in phase 1.
- SM4 compares the check sequence and the failure boundary on guard-binding cases, as the report says. Option (c) is
  not evidence.
- S10: a WebAssembly DFS must visit nodes in the same order so that `UNIQUE_NODES` and `REPAIR_NODES` bind at the same
  node; otherwise it ships only under the version.

---

## IG-S-Q04: S4's change of refusal reasons in phase 1

*Blocks: phase 1's gate. From: IG-S-OPUS-Q5, Astra's S4 review.*

**Question.** S4 keeps every puzzle but turns some `techniques` refusals into `tooHard` in the dig log and the
Generation Steps. Is that log-only change acceptable in phase 1, or does S4 wait for the version?

**Why it matters.** The regression hashes cover givens, solution and structure, not the log; wires G09-G13 contain
`techniques` rejects, and the replay and step view read the log.

**Options.** (a) Accept a log-only change in phase 1, documented. (b) Move S4 to phase 3 under the version. (c) Keep the
old reason by finishing the classification after the bound (keeps part of S4's saving).

**Recommendation.** Opus: (a) if log-only changes are acceptable, else (b). Astra: decide the log's identity separately
from the puzzle hashes, then version or accept it explicitly. Shared: an explicit decision, not an implicit one.

Plan-author answer: **(b): S4 moves to phase 3 under the version.**

The joint estimate of S4 is 1.0 to 1.1 times on bounded removal oracles only. That does not pay for a change of the
dig log, the Generation Steps and wires G09-G13 in a phase whose whole claim is "nothing changes". Under the version
the changed refusal reason is simply part of the new log. Option (c) gives up most of a saving that is already small.

---

## IG-S-Q05: The SM2 gate when the baseline has no hits

*Blocks: phase 3's go or no-go. From: IG-S-OPUS-Q1, Astra's measurement review.*

**Question.** How is "p / c at least 3 times in every cell and 10 times on mega16" judged when the baseline has zero
observed exact hits (mega12 and mega16 deep, 0 of 7), and against which baseline: each current sample kind separately,
and a proposal-only control?

**Why it matters.** The ratio is undefined over zero hits. Today's proposal samples cost 1/14 to 1/19 of a score-targeted
sample on mega12 and mega16, and the plan replaces both kinds; the one mega16 hit came from local search, not a sample.

**Options.** (a) A per-cell break-even gain: the p gain that reaches 90 % exact inside the cell's budget, given the
measured time per sample. (b) Absolute verified hits per CPU second and per wall second, with seed-clustered uncertainty
and non-inferiority controls for cells that already pass. (c) The plan's ratio with a pseudo-count.

**Recommendation.** Opus: (a). Astra: (b), as an early feasibility gate, not a replacement for request-level exact-hit
and p95 qualification; a break-even calculation can be reported beside it only where the baseline probability can be
estimated, and pseudo-counts must not stand in for evidence. Both: report sample-origin and local-origin hits apart,
compare with each current kind, and run a proposal-only control as a diagnostic; not (c).

Plan-author answer: **(b) is the gate; (a) is reported beside it where a baseline rate exists; never (c).**

- The plan's ratio gate (`p / c` at least 3 times, 10 times on mega16) is withdrawn: it is undefined over zero hits and
  it ignored that proposal samples are cheap.
- Gate: verified exact hits per CPU second and per wall second, on paired seeds, against (1) each current sample kind
  and (2) a proposal-only control. Uncertainty is clustered by grid seed. Sample-origin and local-origin hits are
  counted apart.
- Cells with a zero baseline (mega12, mega16, multigrids): go only if the prototype's hit rate, at its lower bound,
  projects to at least half of the requests being exact inside the cell's time budget at pool width 4. This is a
  feasibility threshold. The 90 % offer rule stays with request-level qualification.
- Cells that already pass (classic9's 21 %, wordoku): non-inferiority on hits per second, or S1 stays off there.
- If the gate fails on the large boards, S1 is dropped for them and S9 (bank) becomes their route.

---

## IG-S-Q06: Measuring S1 before the S3 rewrite

*Blocks: the order of the measurement phase. From: Opus's phase review, Astra's order recommendation.*

**Question.** May SM1 and a small S1 and S2 prototype (SM2) run in phase 0, before the large S3 work, rather than SM2 in
phase 3?

**Why it matters.** S1 decides the largest item and whether S9 is needed. The two analysts' remaining S1 speed difference
rests on unmeasured costs: an accepted floor test, a refused floor test at each floor level, a DFS uniqueness check, a
full solve. SM1 profiles today's oracle, proposal, rating and local-search paths; restricted-floor and prefix probes and
a small re-derivation prototype estimate the new test costs, because today's sample distribution is not the frontier's.
No production S1 integration is needed for either.

**Options.** (a) As planned: SM2 in phase 3. (b) SM1, the probes and an SM2 diagnostics prototype in phase 0. (c) SM1 and
the probes in phase 0, SM2 after phase 1.

**Recommendation.** Both analysts: (b). Opus: SM2 in phase 0; Astra: a small feasibility prototype before committing to
the S3 rewrite.

Plan-author answer: **(b): SM1, the probes and the SM2 prototype all run in phase 0.**

S1 is the plan's largest and least certain item, and the report shows its speed case is gone; only its hit rate can
justify it. That must be known before anyone spends the S3 rewrite. The prototype is a test-side harness (beside the
MS05e scripts under `generator/tests/artifacts/`), with no production integration. S5a does not depend on any of this
and may be designed in parallel.

---

## IG-S-Q07: S7 under the version, with a total ceiling

*Blocks: phase 1's content. From: IG-S-ASTRA-Q4, Opus's S7 review.*

**Question.** May S7 move to the versioned phase, with a ceiling on the total restarts or work and an explicit "unknown"
outcome?

**Why it matters.** A ceiling that never triggers on the regression corpus still changes the result of any seed where it
triggers; and a ceiling per restart leaves the number of restarts unbounded (the full-grid search is unlimited from its
50th restart, `generator/js/engine/full-grid.js:241-261`).

**Options.** (a) As planned: phase 1 guards. (b) Phase 3 under the version, with a total ceiling and an "unknown"
outcome. (c) Phase 1 only for ceilings proved unreachable for every admissible seed.

**Recommendation.** Both analysts: (b).

Plan-author answer: **(b).**

Every ceiling moves under the version, with a ceiling on the total work (restarts included, so the unlimited full-grid
search from the 50th restart is covered) and an explicit "unknown" outcome. Only SM3 (finding the stage behind the
325 s Jigsaw request) stays in phase 0, as measurement.

---

## IG-S-Q08: S1's floor: cheap or full

*Design. From: IG-S-OPUS-Q2.*

**Question.** Should phase A descend with a cheap floor (singles to subsets and wings, no chains) or with the plan's
ladder of floors up to the full Nightmare floor; and is this to be re-derived on MS07's weights?

**Why it matters.** Exact Nightmare today is one Nishio plus at most about 1,400 to 1,536 points of other work (minimum
technique term 2,125 against the 2,400 edge), so a floor proof that already uses forcing chains tends to cross the
frontier above the band; the ladder also re-tests every refused group at each floor. MS07 moves the long chains into the
tier and widens the window.

**Options.** (a) Cheap floor. (b) Full ladder, as planned. (c) Both as SM2 variants.

**Recommendation.** Both analysts: (c). Opus expects (a) to win. Astra: a parent's floor proof is not the child's
canonical proof, so this is a comparison to measure, not a theorem.

Plan-author answer: **(c), run on the frozen v3 catalogue (after MS07's weights).**

SM2 compares three floors: cheap (singles to subsets and wings), middle (plus single-digit patterns and fish) and the
plan's full ladder. I expect the cheap floor to win, for Opus's reason: a frontier found with the chains already in the
floor tends to lie above the band. Astra's caveat holds, so this is measured, not assumed. Numbers from before MS07 are
not used, since MS07 widens the Nightmare window from about 220 to about 590 points.

---

## IG-S-Q09: Uniqueness-assuming techniques in the floor test

*Design. From: IG-S-OPUS-Q3, IG-S-ASTRA-Q1.*

**Question.** Phase A proves uniqueness by solving, so its floor test must run without `uniqueRectangle` and the later
uniqueness-based finders, while the Nightmare floor contains them. Accept the resulting shallow candidates as waste, or
run those techniques once a DFS has proved the weakened puzzle unique?

**Why it matters.** Using them with `assumeUniqueness: true` because the parent was unique is circular. A frontier entry
that only a uniqueness technique resolves is shallow under the canonical rating, so it wastes a phase-B solve.

**Options.** (a) Floor without them; accept the waste. (b) Run them after the DFS proves uniqueness. (c) Exclude entries
that only they resolve.

**Recommendation.** Both analysts: (a) by default, (b) as an SM2 variant; Astra: keep "stuck without the uniqueness
assumption" distinct from a true floor frontier in the records.

Plan-author answer: **(a) by default, (b) as an SM2 variant.**

Phase A never runs with `assumeUniqueness: true`. The records keep "stuck without the uniqueness assumption" apart
from a true floor frontier, as Astra asks, so SM2 can show how many phase-B solves the first kind wastes. (b) is adopted
only if that waste is large and the DFS proof costs less than it saves.

---

## IG-S-Q10: Frontier semantics and a total per-sample budget

*Design. From: IG-S-ASTRA-Q2, Opus's S1 review.*

**Question.** Is a frontier entry evaluated at its snapshot or revalidated against the final parent; and what
deterministic total budget covers refused floor tests, DFS checks, the ladder's passes, `deepen` and verification, beyond
K_F?

**Why it matters.** An entry found with more clues can lose uniqueness once more clues are gone. K_F bounds only the full
solves, while the uncounted parts decide S1's per-sample cost and its determinism: on the joint estimate the time per
sample is divided by about 1 to 3 (the new cost is about the same as today's down to about a third of it), not the
plan's 10 times, and the low cases can regress.

**Options.** (a) Snapshot. (b) Revalidate at the final parent. (c) Either, with an explicit reference parent, validation
and a total count budget per sample recorded in the version.

**Recommendation.** Opus: (b) with the total budget of (c). Astra: (c); she accepts either semantics if the reference
parent, the validation and the total count budget are explicit. Both: SM2 reports each part's count.

Plan-author answer: **(c), with the final parent as the default reference.**

- The plan's pseudo-code already forms `Q = P - g` on the final parent, but it did not say that uniqueness must be
  proved again there. It must: a snapshot's uniqueness does not carry over once more clues are gone. Snapshot
  evaluation may be a second SM2 variant; whichever is used, the reference parent is explicit in the record.
- A deterministic total budget per sample, in counts and never in time, covers floor-test deductions, DFS nodes, ladder
  passes, `deepen` proposals and verification solves. When it runs out the sample ends with reason `budget`, which is
  not an error. The budget values belong to the generator version.
- SM2 reports the count of each part, so the budget is fitted and not guessed.

---

## IG-S-Q11: S1's scope by level and cell, and Killer

*Design. From: IG-S-OPUS-Q9, IG-S-OPUS-Q10, Astra's protected class F.*

**Question.** Does S1 apply to every level, or only to the levels and cells that fail; and is Killer excluded until it
is measured?

**Why it matters.** Hard to Master pass today on most boards; S1 changes their puzzles and SM2 does not measure them.
`digKiller` calls `digStage` (`generator/js/variants/killer.js:1010-1019`), so S1 inside `digStage` reaches Killer's cell
dig and changes its puzzles, while Killer's structure work may dominate its time (the complete split is not measured)
and its Hard and Expert misses may need calibration (MS07e) rather than search.

**Options.** (a) Every level. (b) Only failed or gated cells, chiefly Nightmare and up; Killer opted out until a separate
measurement. (c) Every changed level, with SM2 extended to them.

**Recommendation.** Both analysts: (b). Astra adds that an already-good Nightmare cell such as Jigsaw stays protected
unless SM2 establishes non-regression, and that Killer is explicitly gated.

Plan-author answer: **(b).**

S1 is switched on by an explicit allowlist of (variant, board, level) cells, stored with the generator version. A cell
enters the list only after SM2 passes for it and qualification shows no regression. Starting candidates: Nightmare on
classic9, wordoku, mega12, mega16 and the multigrids. Hard to Master stay on today's path. Killer, Greater-Than and
Jigsaw are excluded; for Killer the design must make `digKiller`'s call into `digStage` keep the version-1 sample kinds.

---

## IG-S-Q12: More attempts (OD-S4) before S1 on 81-cell boards

*Design. From: IG-S-OPUS-Q8, Astra's availability review.*

**Question.** Should OD-S4 be measured and decided right after phase 2 for classic9 and wordoku Nightmare, before S1?

**Why it matters.** Their exact rates are 21 of 100 and 4 of 20; about ten times more effective attempts are needed for
90 %. The first phases make an attempt about four times cheaper. The UI allows at most 20 attempts
(`generator/js/ui/store.js:38`), and defaults, recipes and history must stay compatible with a higher number.

**Options.** (a) An attempt sweep (16, 32, 64) after phase 2, then decide OD-S4. (b) Wait for phase 3. (c) No change.

**Recommendation.** Both analysts: (a), as a measurement; the offer stays with qualification. Opus's sensitivity: about
72 attempts fit 10 s by median time, about 88 % exact. Astra's contrasting sensitivity: about 45 attempts by a projected
p95, about 73 %. Both rest on linear scaling and independent equal-yield attempts, and neither is a prediction; a p95 is
not a per-attempt additive budget, and a sample-side gain need not multiply the unchanged local-search success.

Plan-author answer: **(a), as a measurement.**

Sweep 16, 32 and 64 attempts on classic9 and wordoku Nightmare after phase 1 (pool and S3), judged on p95 wall time and
exact hits. Neither the 88 % nor the 73 % figure is used for planning. If the sweep supports more attempts, OD-S4 goes
to the owner with two points to settle: whether the UI's ceiling of 20 rises, and whether the default by size is
stored in the recipe (it must be, or old recipes change). If more attempts alone reach 90 % on 81 cells, S1 is not
needed there.

---

## IG-S-Q13: S6's results in the cache and history

*Design. From: IG-S-OPUS-Q12, Astra's S6 review.*

**Question.** May a time-limited (anytime) result be cached and stored in history, and if so with what?

**Why it matters.** It depends on the device: the cache's background regeneration must reproduce givens, solution and
rating (`generator/js/ui/cache.js:5-13`) and will drop it; a history pick regenerates another puzzle; an absent wire
`exact` reads as false (`generator/js/engine/pipeline.js:336-351`); S6 can answer only from a complete verified
checkpoint, and the keeper's state is private to a worker.

**Options.** (a) Neither cached nor stored. (b) Stored with the complete puzzle and its provenance (needs IG-S-Q01).
(c) Configuration only, with a notice.

**Recommendation.** Both analysts: (a) unless IG-S-Q01 stores puzzles, then (b); never present a timed result as the
seed's canonical result.

Plan-author answer: **(b), which is possible because IG-S-Q01 puts history v2 in phase 1.**

A timed result is stored in history with the complete puzzle and `timed: true`. It is never written to the result cache
under its seed and never presented or exported as that seed's canonical result. The wire carries `exact` and `timed`
explicitly (wire version 2), so an absent field can no longer read as false. S6 answers only from a complete verified
checkpoint that the worker has already posted to the main thread; if none exists, the request still fails as today.

---

## IG-S-Q14: S8 as an extension of the existing cache

*Design. From: IG-S-OPUS-Q11, IG-S-ASTRA-Q7.*

**Question.** Is S8 meant to extend `SG.cache` (which already pre-generates seedless puzzles in idle time) or to replace
it, and should its `COSTS` table be refreshed first?

**Why it matters.** `COSTS` comes from rating v2 (mega16 Nightmare listed at 700 ms, measured about 105 s), so admission
is wrong for the slow cells; explicit seeds are never served from the pool; a second stock would duplicate ownership,
priority and cancellation.

**Options.** (a) Extend `SG.cache` (a persistent layer, refreshed `COSTS`). (b) A new stock. (c) Drop S8.

**Recommendation.** Both analysts: (a), keeping foreground priority, explicit-seed semantics and replay consent.

Plan-author answer: **(a).**

S8 extends `SG.cache`: a persistent layer and a `COSTS` table refreshed from the frozen v3 measurements, with
foreground priority, explicit-seed semantics and replay consent unchanged. It is a late, low-priority item: it improves
only the perceived time of seedless requests and does nothing for availability.

---

## IG-S-Q15: S9's bank: diversity, exhaustion and safe transformations

*Design, OD-S3. From: IG-S-ASTRA-Q8, the joint review of S9.*

**Question.** What minimum bank diversity and option coverage are acceptable, what happens when history exhausts the
bank, and may the Killer and Greater-Than transformations be restricted to geometric symmetries?

**Why it matters.** Row and band permutations keep the Sudoku units but break connected Killer cages
(`generator/js/variants/killer.js:212, 528`) and adjacent Greater-Than signs (`generator/js/variants/greater-than.js:21`).
A finite bank runs out under history, and its content becomes part of the generator identity.

**Options.** (a) Geometric symmetries only for Killer and Greater-Than, the plan's list elsewhere. (b) Any listed
transformation, with each derived puzzle validated against its cage and sign contract. (c) No bank for those variants.

**Recommendation.** Both analysts: (a) or (b), with a stated minimum of distinct roots per option set and a defined
exhaustion behaviour.

Plan-author answer: **(a), and every derived puzzle is validated anyway. Sizes are an owner decision (OD-S3).**

- The plan's transformation list is wrong for Killer and Greater-Than. For them only the board's geometric symmetries
  are used. Digit relabelling is out as well: it changes cage sums and breaks the signs.
- Every puzzle served from the bank gets one canonical rating and the structure check before it is shown. The report
  prices this at about 0.05 to 0.25 s on the large boards.
- Proposal for the owner, to be fixed only if S9 is needed: at least 200 distinct roots per offered option set. When
  every root has been used, try live generation under the normal guard, then reuse the least recently used root with a
  new transformation.
- The bank's content id is part of the puzzle's provenance (IG-S-Q01).
- S9 is designed only for cells that stay below 90 % after phase 3, or where SM2 rejects S1.

---

## IG-S-Q16: Sign and dig guidance after MS05e

*Design. New in the joint report (CV6-05, MS05e; evidence committed in `ef8a9cc`, read by Opus only).*

**Question.** Is a guided or frontier sign dig for Greater-Than (the plan's S1 open point "remove a sign") in this
feature's scope, now that CV6-05 (Q1(b)) set aside MS05e's pool and did not authorise IR29's lever; and must any such
item first measure MS05e's miss predicate exactly and its whole-pass cost?

**Why it matters.** MS05e recorded (`docs/difficulty-v3/cv6-guided-sign-dig-2026-11-14.md` and
`docs/difficulty-v3/evidence/MS05e/`, committed in `ef8a9cc`; measured on `f7be90f`, the source these analyses were made
against): rating `SIGN_POOL` candidates per removal raised the sign ratings per removal from 1.15 to 4.0, 7.8 and 14.9
and the oracle calls per request 4.5 to 9.4 times, while the dug samples per exact request fell by at most about half
and rose on some cohorts; 22.1 % of the Greater-Than Normal misses ended at the clue floor and 49.7 % were setups two or
more clues above it (end states, not the coverage of an intervention); and the requests whose local search ran to the
proposal cap took 95 % of that cohort's time (request-group time, not stage time). Greater-Than's `solveWithin` already
solves with `assumeUniqueness: false` (`generator/js/variants/greater-than.js:192-199`).

**Options.** (a) Out of scope: Greater-Than keeps its sign dig and gains only from S3, S5 and S7. (b) In scope as a gated
diagnostic and feasibility item after the frozen baseline: measure the exact miss predicate, the whole-pass cost,
accepted and failed probes and the local work; candidates include IR29's lever (count uniqueness only after a sound
bounded solve gets stuck) and guidance for the setup clues. (c) In scope without that measurement.

**Recommendation.** Opus: (b), not (c). Astra: (b), as a gated diagnostic and feasibility item after the frozen baseline,
not the approval of a production guided pool or of IR29; keep canonical final verification and explicit unknown or
capped outcomes; testing a sound-solve-first uniqueness order is reasonable. She endorses no number from the MS05e
evidence, which she has not reviewed.

Plan-author answer: **(b), as a phase-0 diagnostic only.**

This is consistent with CV6-05: no guided pool and no IR29 lever go into production from this feature. Phase 0 measures
Greater-Than's exact miss predicate, the whole-pass cost, accepted and failed probes and the local work, and may test
the sound-solve-first uniqueness order in the harness. Any production change that follows needs its own decision.
Until then Greater-Than gains from S3 and S5 only, and its S7 ceilings come with the version.

---

## Direction after the joint report (plan author, 2026-11-14)

**Verdict on the report.** Accepted as the planning basis; where it and `plan.md` disagree, the report and the answers
above hold. The checks I repeated in the source agree with it (history stores no puzzle; `OBJECTIVE_STEPS` and
`UNIQUE_NODES` are count guards). Three points of `plan.md` are withdrawn:

1. The projection "mega16 Nightmare sample batch 97 s to about 1.6 s" (plan §4). It counted full solves only and left
   out refused floor tests, DFS checks and the cheap proposal samples that S1 replaces.
2. S1 as a speed item. It is a hit-rate item, and its hit rate is unmeasured.
3. "Byte-identical" for S3 and "old recipes keep their stored puzzle" (IG-S-Q03, IG-S-Q01).

One reservation: the report's midpoints are the mean of two unmeasured projections. They order the work; they are not
gates and must not be quoted as expected results.

**What this means for the goal.** The safe work (pool, S3) gives about 4 times on the 8- and 4-attempt boards and about
2.6 times on the two-attempt boards. That is not enough to make any failing cell offerable. Whether mega12, mega16 and
the multigrids reach Nightmare, and any Hell level after MS07b, depends on S1's hit rate or on the bank (S9).

**Revised order.**

| Phase | Content | Gate |
|---|---|---|
| 0. Measure (no runtime change) | Freeze on the final v3 catalogue (after MS18e and MS17b). SM1 profiles and restricted-floor probes. SM2 prototype with the variants of IG-S-Q08 to Q10. SM3. Greater-Than diagnostic (IG-S-Q16) | IG-S-Q05's gate, per cell: S1 go, or bank route |
| 1. Equal results | Generator version field, history v2, wire v2 (IG-S-Q01). S5a pool. S3 with virtual checks (SM4) | regression hashes and check sequences equal; pooled and serial times (IG-S-Q02) |
| 1b. Attempts | Sweep 16 / 32 / 64 on classic9 and wordoku Nightmare (IG-S-Q12) | owner decides OD-S4 |
| 2. Generator version 2 | S1 + S2 on allowlisted cells that passed phase 0; S4; S7; S5b; S6 | qualification of every changed cell |
| 3. Fallbacks and comfort | S9 bank for cells still below 90 %; S8; S10 only if a post-phase-2 profile shows a kernel share that pays | per item |

**Next actions.**

1. Owner: confirm IG-S-Q01 (history v2, notice on old entries), IG-S-Q02 (guard as wall time) and that phase 0 may
   start once difficulty-v3 freezes.
2. Analysts or architect: write the phase-0 measurement task (scripts, cells, sample sizes, record formats) from the
   report's §6 and these answers. Nothing in `generator/js` changes in phase 0.
3. Architect: start the design of phase 1 (version field, history v2, S5a) in parallel; it does not depend on phase 0.
4. After phase 0: revise `plan.md` to version 2 with measured numbers before any design of phase 2.

---

## Owner decisions (2026-11-14, 19:10, through `ask_user` and email)

| Id | Decision |
|---|---|
| IG-S-Q01 | **Confirmed as answered:** `generatorVersion` and history version 2 (stored puzzle and provenance) ship in phase 1, before the search changes; version-1 entries regenerate on the current path with a notice that they may differ. |
| IG-S-Q02 | **Confirmed as answered:** with a pool, the 120 s guard is the wall time of the request from its start. |
| Phase 0 | **Confirmed:** the official phase-0 measurements start once difficulty-v3 freezes. Prototypes are built now as test-side harnesses with no production change; their numbers are provisional (pre-freeze) and are re-run on the frozen catalogue. |

## Interim note after the first prototype measurements (2026-11-15)

**Non-gating; provisional (pre-freeze), on the pre-MS07 catalogue.** These prototypes changed no production code.
IG-S02 median ready-wall S5a speed-ups (three pairs per cell): mega16 1.92x, mega12 3.22x, samurai 1.79x,
classic9 3.22x, Killer 2.55x and Greater-Than 2.62x; CPU costs and early-exact regressions are retained.
IG-S03 found no material net gain from partial S3 (singles and subsets); this does not refute full S3,
or show that the remaining finders dominate solver time.
IG-S04/05 show no demonstrated exact-yield benefit on classic9, mega12, mega16 and samurai.
IG-S05: zero verified hits in every mode, native controls included, over eight grid clusters per cell.
Failure modes differ: empty unique frontiers, above-band or shallow candidates, and count-budget stops.
MS07 may change the window, floors and search; these pre-freeze results decide neither the S1 gate nor S9.
IG-S06 is deferred (not passed or refuted); SM1, SM3 and the Greater-Than diagnostic continue.
IG-S10 will bring the full interpretation, SM1 attribution and the frozen-catalogue rerun proposal.
No question or policy decision is requested.

IG-S07 (non-gating, pre-MS07): about 81 % / 77 % of the single mega16 / mega12 Nightmare profiles' engine-root
wall time lies in legacy `nishio`/`forcingChain`: hotspots, not evidence of cacheability or achievable gains.
Frozen attribution must distinguish MS07b's new chain families (`forcingChainLong`, `nishioDeep`).
The interpretation remains with IG-S10.

## Phase-0 measurement round closed (2026-11-15)

The authorised pre-freeze measurement round is closed. The [final report](evidence/phase0/provisional-r1/report-r2.md)
links the reconciled coverage, final accounting, disabled gate and frozen-rerun proposal.
IG-S06 remains deferred; IG-S09 Nightmare 706-709 remain unstarted. No catch-up or frozen round is authorised now.
Difficulty-v3 resumes.

D1-D8 remain future decisions: frozen order/budget; composition after zero yield; projection assumptions and
non-inferiority margin; four extensions; missing Nightmare pairs; MS07b chain attribution; versioned S7 limits;
and adapter/guard/footprint carry-overs.

Future work requires A1-A6 as applicable: freeze attestation, budget approval, approved assumptions/margin,
separate IG-S06 approval, each extension's approval, and a decision on the missing Nightmare pairs.
All findings remain provisional: the gate is `not-evaluable-pre-freeze`, and no qualification, default,
bank-route or production decision follows.

## Cover note for provisional review (2026-11-15)

The [r3 measurement report](evidence/phase0/provisional-r1/report-r3.md) supersedes r2's interpretations,
not its measurements. This package supports provisional design review; it is not an official gate
or a source-current measurement basis for plan-v2 performance and yield forecasts.

The measurements use the MS05e-era runtime (f7be90f, unchanged by ef8a9cc; fingerprint 36b2b832…).
The audit/smoke snapshot, rating-v3 8b70875, includes MS06a-d and MS07a-d: 11 runtime files changed
(+808/-208), including windowed chain kernels with SHORT_MAX = 4. The canonical-rating technique
weights are 1400 for forcingChainLong and 2600 for nishioDeep, not complete puzzle scores.
The reported MS07c classic9 Nightmare experiment at C = 4 achieved 12/12 exact, p50 0.15 s and
p95 0.51 s; G13 samurai/42 became exact at attempt 1, G10 Killer/42 changed from shallow to exact,
and Hell 1 became non-vacuous. These are different source/cohort/cap observations, not paired
improvements over this package. MS08-MS16 are expected to add about 14 further finders.

Errata E1-E10 correct the baseline statistics and sample-mix wording, distinguish cheap unsuccessful
sample processing from exact yield, report isolated S2 costs, correct the first-phase formula and
S4's placement, withdraw representative 1,296/10x costing, and identify missing measurements and
source-preparation costs. Killer's comparison remains three-pair evidence; unstarted requests are
not censored requests.

Compatibility smoke ([report](evidence/phase0/smoke-rating-v3-8b70875/smoke-report-r2.md)): harness
`8f0018b5c36d…` against rating-v3 `8b70875`: self-test 36/36; 5/8 adapters apply textually, while
`profile`, `jigsaw-profile` and `gt-diagnostic` fail at digger anchors, and `frontier-hooks` has a stale
`refusalReason` exposure; two pure suites timed out and native/no-op puzzle parity remains untested
(1/4 loader rows completed); 144.472 s separately charged, with no adapter repairs or performance
conclusions. Compatibility only; no repair or performance conclusion.

Decisions D1-D10 and applicable approvals A1-A8 remain pending. D9/A7 adds the missing width sweep
and restricted-floor probes; D10/A8 adds frozen-source preparation, repairs, reproof and recalibration.
Apart from the separately authorised compatibility smoke, no new measurements, IG-S06,
Nightmare 706-709 catch-up or frozen round are authorised. The gate remains `not-evaluable-pre-freeze`.

## Plan version 2 (plan author, 2026-11-15)

`plan.md` is revised to version 2 from the provisional round and the r3 report, as "Next actions" 4 asked. Its
section 0 gives the estimate against the measurement and the changes; errata E1 to E10 are taken into it. It
authorises no run and changes no gate: the gate remains `not-evaluable-pre-freeze`.

- **As estimated:** S5a (x1.8 to 3.2 on the wall clock, the same puzzles). **Below the estimate:** the first
  phases as built (1.3 to 2.1 times short of the report's figures), because the partial S3 added nothing.
  **No evidence either way:** S1's hit rate (no exact puzzle in any mode, controls included). **No saving:** S2.
- **Changed:** phase 1 is the version field, history v2 and S5a only; S3 is re-scoped to the chain kernels and
  gated by the frozen SM1; S1 and S2 get a stop rule at the frozen SM2 screen; S5b is promoted and decoupled
  from S1; S7 targets the full-grid search first; the "1,296 solves per sample" and "10 times fewer solves"
  premises are withdrawn.
- **Positions on D1 to D10:** plan section 5. They are proposals for the pack author and the owner, not
  approvals; A1 to A8 stay pending.
- **Owner decisions:** plan section 7 (new: OD-S5, the pool's CPU cost; the harness repair on the frozen source
  before the frozen budget is set).

---

## Questions after plan version 2 (analysts, 2026-11-15)

These questions follow the two independent analyses and both cross-reviews of `plan.md` at `adb7184`.
The joint conclusions, evidence, candidate dispositions, speed scenarios and verbatim owner-decision texts
are in `plan-v2-joint-report.md`. This is the final merged numbering; it supersedes the local Q19+ lists
in the analyst files, which remain unchanged.

**Status.** Q19, Q20, Q22, Q23 and Q24 are joint questions. Q21 and Q25 retain Opus-only requests and state
Astra's view. None authorises a run or changes active difficulty-v3 scope, sample counts, ceilings or priority.
S-OD7's Killer Hard/Expert withholding and the six unlaunched cells' existing MS18c route remain in force.

### IG-S-Q19: Intrinsic finder semantics versus generator-only guard policies

*Blocks: a solver optimisation's version boundary and failed-parity fallback. From: Astra phase-1 Q19;
endorsed by Opus in its cross-review. Status: joint.*

**Question.** Does section 9's rule that changed findings, finding order or work units belong to difficulty-v3
supersede IG-S-Q03(b), or does it distinguish intrinsic finder semantics from generator-only quotas/check
policies?

**Why it matters.** Q03(b) allowed a family that cannot preserve its checks to move under the generator
version with a different generator guard unit. The newer finders also have an intrinsic 50,000-unit cap that
can change a canonical finding, independently of a generator's outer quota. Those are different contracts.
Nishio propagation can call inherited budgets directly, so preserving one `ctx.check()` per trial is not a
complete equivalence proof.

**Options.** (a) Preserve all intrinsic findings, units and canonical semantics; permit a deliberately
versioned generator-only quota policy while retaining canonical verification. (b) Require complete
reference check behaviour everywhere in this feature and defer any failed-parity family. (c) Route any
desired canonical change to the owning rating feature or a later separately approved feature.

**Recommendation.** Both analysts: no generator version licenses a canonical rating change. State (a)'s
boundary explicitly, with (b) as the safe fallback and (c) for actual intrinsic changes. Equal-result items
still need check-site and cap-boundary parity, not only equal final scores.

Plan-author answer: **(a) is the boundary, (b) the fallback, (c) the route for any intrinsic change. Section 9's
rule does not replace IG-S-Q03 (b); it narrows it.**

- *Intrinsic contract (the rating's):* a finder's findings, their order, its work units and its own caps
  (`NEW_FINDER_WORK_LIMIT`, the chain kernels' work cap). They decide the canonical rating. No generator version
  may change them; a wanted change goes to the feature that owns the rating (c).
- *Generator-only contract:* the outer quotas the generator counts around the solver (`OBJECTIVE_STEPS`,
  `ANALYSIS_NODES`, `UNIQUE_NODES`, `REPAIR_NODES`). These may move to another unit under `generatorVersion`,
  as IG-S-Q03 (b) allowed, and every accepted puzzle keeps its canonical verification.
- IG-S-Q03 (b) therefore covers the second contract only. I did not draw that line when I answered it.
- *Where the two cannot be separated* (a check site that serves both, such as the inherited budget called
  inside Nishio propagation), the family stays on its reference scan in this feature (b).
- An equal-result item proves parity of check sites and cap boundaries, not only of final scores. A result
  ended by a cap or a budget is never stored or reused as a completed negative.

---

### IG-S-Q20: The whole-request 1.5x kernel gate

*Blocks: selection and acceptance of phase-3 kernel work. From: Astra phase-1 Q20; endorsed by Opus in its
cross-review. Status: joint.*

**Question.** Is the factor required per named target cell or over a pooled population, and against which
generator, quotas and scheduler? Which cold/ready wall or CPU statistic is binding?

**Why it matters.** The current source has no Hell 1 finder/stage profile. A kernel that takes little of a
request cannot give a large whole-request gain, and already-fast controls may not call it. Comparing a
pooled new generator against the old serial baseline could count S5's improvement twice.

**Options.** (a) Paired whole-request performance on named targets against the same post-phase-2 generator,
quotas and pool, with explicit non-regression controls. (b) A predeclared weighted population and comparator,
with every cell shown separately. (c) A kernel-only speed target, explicitly replacing the whole-request gate.

**Recommendation.** Both analysts: (a). Name the targets and statistic after profiling, before evaluating an
optimisation. Report CPU and cold/ready wall separately. Do not substitute a kernel microbenchmark for the
whole-request gate or require an unused kernel to speed a control.

Plan-author answer: **(a).**

- *Unit and comparator.* Each named target cell, paired on the same seeds, against the same post-phase-2
  generator, quotas and pool (inner width four, outer `--jobs=1`). The two arms differ in the kernel only, so
  S5's gain is not counted twice.
- *Statistic.* Ready wall time of the request binds: the geometric mean of the per-request paired ratio, per
  target cell. CPU and cold wall are reported apart, and CPU may not rise. A kernel microbenchmark is never the
  gate.
- *Controls.* Named cells that call the kernel must not be slower (ratio at least 0.95). A cell that never calls
  it is checked for identical puzzles only; it is not asked to speed up.
- *Order.* Targets, controls and the statistic are named after the frozen profile (F3) and before the
  optimisation is evaluated.
- *Admission from the profile.* By `F = 1/(1 - f + f/s)`, a whole-request 1.5 needs an eligible share `f` of at
  least one third even for an unbounded kernel gain, and of two thirds at a kernel factor of 2. An item whose
  profile cannot reach that is not built.
- *My proposal on the threshold:* 1.5 stays for the large items (the chain work of S3, K1, S10). For a
  medium-sized equal-result item with a complete equivalence proof (K2), 1.15 on the same statistic. A single
  1.5 would rule K2 out before it is measured: its favourable case is about 1.17.

---

### IG-S-Q21: The meaning of the 220-to-590-point window

*Clarification, not a run request. From: Opus phase-1 Q19. Status: Opus-only request; Astra's disposition below.*

**Question.** What quantity and assumptions do the figures in plan sections 0.2 and S1's version-2 note
describe? Should version 3 remove them or retain an explicitly derived effective-headroom illustration?

**Why it matters.** The Nightmare score band remains `[1500,2400)`. With the score's lower bound
`V + 1.25*w + extra`, ideal headroom to 2400 is `275-V-extra` for weight 1700 and `650-V-extra` for weight
1400. This explains a possible illustration, but not a measured, board-independent widening of the band.

**Options.** (a) Remove 220/590 and state the unchanged band and 375-point change in the one-step lower
bound. (b) Retain the illustration with the empty-cell/other-deduction assumptions, its source and a
Derived or Projection label rather than a measured-band claim.

**Recommendation.** Opus asks for the definition/source. Astra prefers (a), or considers a fully stated
(b) sufficient without an additional design gate. Both agree that the literal score band did not widen.

Plan-author answer: **(a): remove both figures.**

- The Nightmare band is `[1500, 2400)` before and after MS07; it did not widen. The sentences in plan sections
  0.2 and S1's version-2 note, and the same phrase in my answer to IG-S-Q08 above, are withdrawn.
- The figures are consistent with the headroom above one required step, 275 at weight 1700 and 650 at 1400,
  less an allowance of 55 to 60 points for `V` and the other deductions. I recorded no source or assumptions
  for that allowance, and it depends on the board, so I do not keep it as an illustration.
- Version 3 states the unchanged band and the 375-point change of the one-step lower bound, labelled Derived.
  IG-S-Q08's instruction itself stands: the floor comparison runs on the frozen catalogue.

---

### IG-S-Q22: Outer concurrency under the agreed pooled qualification

*Blocks: the future improve-generating measurement/qualification invocation, not active difficulty-v3.
From: Opus phase-1 Q20 and both analysts' concurrency cautions. Status: joint.*

**Question.** Under IG-S-Q02's fixed inner width four, which fixed outer `--jobs` value should define paired
timing and budget verdicts? How are any separate throughput measurements labelled?

**Why it matters.** Q02 already requires pooled request wall time, serial reporting and no physical-core
oversubscription. It does not pin one outer count for every machine. MS07e's `--jobs=4` meant four serial
requests, not a four-worker request. Mixing that timing with a solo pooled request is not a matched
performance comparison.

**Options.** (a) Outer `--jobs=1` for the pooled width-four and serial width-one comparisons and the
feature's budget verdict; any higher-concurrency study separate. (b) Another fixed outer count with a
recorded physical-capacity and non-oversubscription receipt, the same count in paired arms.

**Recommendation.** Both analysts: (a) for the clean per-request comparison, while retaining every existing
Q02 condition, including the serial/file-mode caveat. This is for improve-generating after closure; it does
not amend difficulty-v3's final qualification or its populations. Do not mix concurrency cohorts into one
unqualified p95.

Plan-author answer: **(a): outer `--jobs=1`.**

For this feature's paired timing and budget verdicts: inner width four at outer `--jobs=1`, and the serial
control at width one and outer `--jobs=1`. Every condition of IG-S-Q02 stays, the serial `file://` caveat
included. A throughput study at a higher outer count is labelled as one and never pooled into a p95 with these.
The checkpoint's `--jobs=4` records are context, not matched timing controls. Nothing here changes difficulty-v3's
qualification.

---

### IG-S-Q23: The scale of Hell 1 work after the final catalogue

*Blocks: version 3's residual-cell scope and any bank programme. From: Opus phase-1 Q21 and Astra's
cross-review merged Q19. Status: joint.*

**Question.** If the final catalogue still gives Hell 1 little or no exact yield, does version 3 retain only a
bounded diagnostic, fund a larger live-search/kernel programme, or ask for a separately costed bank route?

**Why it matters.** The current 0/112 completed results are shallow; speeding those same requests does not
make them exact. That does not prove intermediate floor tests all fail or that canonical exact puzzles
cannot exist. New finders may change both the hit rate and per-attempt cost. A bank before the finders arrive
is not the scope of a feature that starts after MS18e.

**Options.** (a) Reconcile the final baseline, take only the approved residual diagnostics and retain
unqualified cells as unoffered. (b) Approve a specific live-search/kernel hypothesis with its own yield,
identity and budget gates. (c) Request an OD-S3 feasibility plan for distinct roots, canonical/structural
verification, content identity, novelty and exhaustion.

**Recommendation.** Both analysts: (a) first. Escalate to (b) only for a justified hypothesis and to (c) only
after a priced root-supply/verification proposal. No bank design precedes the final catalogue; no requiredness,
rating or offer threshold is weakened. S-OD7's separate Hard/Expert withholding is unchanged.

Plan-author answer: **(a) first.**

- Withdrawn from plan 9.2: S9 "if the owner wants Hell 1 before the finders arrive". A bank is not designed
  before the final catalogue (the report's JV2-S14).
- After the final catalogue: reconcile the baseline, run only the approved residual diagnostics, and keep
  unqualified cells unoffered. The 0 of 112 are completed shallow results; making them faster does not make
  them exact.
- The floor diagnostic (K4, diagnostic only) is what would point to (b) or (c). If floor-stuck candidates turn
  up but end above the band, unsolved or capped, there is a specific steering hypothesis for (b), with its own
  yield, identity and budget gates. If almost none turn up, live search is not steering toward the tier, and
  the question becomes (c), on a priced plan for distinct roots and verification.
- No requiredness, rating or offer threshold is weakened, and S-OD7 is untouched.

---

### IG-S-Q24: The reduced frozen baseline, telemetry and confirmation population

*Blocks: the new frozen-round manifest and budget. From: Opus phase-1 Q22 and Astra's baseline/recording
recommendations. Status: joint; the proposed 20+ prototype count is not an official qualification change.*

**Question.** Confirm the reduced package and its fields, which compatible final records can be reused,
and which selected cells should receive 20 or more independent paired requests for prototype confirmation
after diagnostic admission and costing.

**Why it matters.** The pipeline already exposes actual `attempts`, `timings` and `work`; the qualifier does
not retain them. Slow exact hits remain unclassified. Repeating the old full Nightmare screen would price
obsolete work, while reusing incompatible source/concurrency records would create false before/after
comparisons.

**Options.** (a) A staged package: compatible baseline reuse; missing attempt/origin/stage/quota records;
selective S5a/SM5; selected profiles; S7's node distribution; a conditional Hell floor diagnostic; then
costed confirmation on admitted hypotheses. (b) The former full frozen manifest. (c) Defer the feature.

**Recommendation.** Both analysts: (a). Keep cold/ready wall, CPU including speculation, outer jobs and inner
width explicit. Reuse only full identity/protocol matches; missing fields remain missing. Twenty or more
prototype requests is a proposal to cost, not a substitute for official qualification's 40-request first
round/possible expansion or an authorisation to launch the six omitted difficulty-v3 cells. Price commands,
limits, validation and wrapper grace after the narrowed repair; no old allocation carries over.

Plan-author answer: **(a).**

- *Fields.* From the pipeline's existing output: `attempts`, `timings`, `work`. Added: the origin of the
  selected candidate; attempts started, consumed and discarded; per-attempt and per-sample stages; quotas and
  stop reasons; cold and ready wall time; host CPU with speculation; outer jobs and inner width. A missing
  field stays missing; it is not read as zero or inferred for exact hits.
- *Reuse.* A final record is reused only on a full match of source and catalogue identity, the complete
  request and the protocol. Puzzles and exact flags do not depend on the outer concurrency, so matching final
  records can serve for outcomes; their timings at another outer count are context only.
- *Cells for the 20 or more paired requests,* named for good after F1's reconciliation. My proposal:
  Greater-Than Master (the slow exact tail), Killer Nightmare and Killer Master, one classic-size Hell 1 cell
  (diagonalX, the largest p95), one multigrid Hell 1 cell (Samurai), and mega16 Nightmare if it is still
  unqualified. Classic9 and mega12 Nightmare are the early-hit controls for the pool.
- This is a proposal to cost after the narrowed repair. It does not replace the official 40-request round and
  launches none of the six omitted difficulty-v3 cells. The old full Nightmare screen is not repeated.

---

### IG-S-Q25: An exceptional preliminary SM5 before the freeze

*Optional scheduling question, not a blocker to the post-freeze design. From: Opus phase-1 Q23.
Status: Opus-only request; remaining analyst difference.*

**Question.** Should SM5 wait for the frozen round, or should the owner be asked to approve a bounded
preliminary width-1/2/4 experiment on a named current source, with mandatory final-source rechecking?

**Why it matters.** Pool architecture can be designed now, but early-hit frequency, CPU cost and latency
benefit change with the runtime. The provisional round is closed, no remaining budget is carried over and
difficulty-v3 keeps machine priority.

**Options.** (a) Wait for the attested frozen source and repaired measurement package. (b) A separate,
explicitly approved test-side exception with a named source, scope, machine ceiling, priority protocol and
stop conditions; no production change or formal frozen-gate claim.

**Recommendation.** Opus requests (b) if resources permit. Astra recommends (a), unless a specific preliminary
result would change a design decision enough to justify the extra work. Both require final-source rechecking.
Neither architecture work nor this question authorises an engine run; (a) remains the default without a
separate receipt.

Plan-author answer: **(a): wait for the frozen source.**

- A preliminary width sweep would change no design decision I can name. Under IG-S-D1 (B) the pool is built
  with the early-hit path and the serial fallback whatever the numbers are; the numbers only tune them.
- What SM5 measures (how often the first attempt hits, the CPU cost, the latency gain) moves with the runtime,
  and MS08 to MS16 are still to come; the frozen recheck would be the measurement that counts.
- The harness has no native or no-op puzzle parity on the current source. A run now pays for that on a source
  that will change, while difficulty-v3 holds machine priority.
- Exception: if the S5a design names a decision that width 1, 2 and 4 data would change, that question goes to
  the owner as (b), with its source, scope and ceiling.

---

## Pending owner decisions: the plan author's position requested (2026-11-15)

The joint report (`plan-v2-joint-report.md`, section (f)) puts six decisions to the owner. The owner asks the plan
author for a position on each before deciding. The analysts' joint recommendation is given; the full option texts and
evidence are in the joint report. Answer each with an option and any condition.

### IG-S-D1 (OD-S5): pool CPU cost and enablement

Options: (A) eager pooling up to four workers; (B) selective pooling up to four with a mandatory early-hit path or
head start and a serial fallback; (C) serial until browser evidence. The observed 1.6x is not a CPU ceiling:
individual pairs reached 4.39x and 4.13x. Analysts: **(B)**, default enablement only after frozen CPU, cold and
ready-wall results, and a phone-class check before mobile enablement.

Plan-author answer: **(B). This replaces my proposal in plan section 7 ("accept", up to 1.6 times).**

- "Up to 1.6 times" was a cell median, not a bound: single early-exact pairs reached 4.39 and 4.13. Eager
  pooling (A) therefore spends the most CPU exactly where the first attempt already hits.
- Conditions: an early-hit path (a head start for attempt 1, or serial where the cell hits early), chosen per
  cell from frozen data; the serial lane on `file://` and at width one; the same puzzle at every width. The
  head start changes timing only, never the result.
- Default enablement only after the frozen CPU, cold-wall and ready-wall results, and a phone-class check
  before it is enabled on mobile.

### IG-S-D2 (D10/A8): harness repair before the frozen budget

Options: (A) repair the old full package now; (B) a separately costed, narrowed repair after MS18e on the attested
frozen source, then price the measurement round; (C) defer the feature. Analysts: **(B)**, with actual loader parity
and capability checks and never a fallback to the old engine; no provisional unused time carries over.

Plan-author answer: **(B).**

The repair is narrowed to the consumers the reduced round keeps (loaders, pool, telemetry, the full-grid hook
and any approved diagnostic hook), on the attested frozen source, as its own costed task. It must show actual
native and no-op puzzle parity; the smoke's textual applicability is not that. It never falls back to the old
engine. The measurement round is priced only afterwards, and no provisional time carries over.

### IG-S-D3 (OD-S3): the Hell 1 route

If Hell 1 still lacks reliable exact yield on the final catalogue: (A) bounded diagnosis while it remains unoffered;
(B) a separately funded live-search or kernel programme; (C) a separately costed seed-bank feasibility plan.
Analysts: **(A) first**; (B) only with a specific viable hypothesis; (C) only with a priced distinct-root supply and
verification plan. No bank design or supply commitment precedes the final catalogue.

Plan-author answer: **(A) first.**

(B) only with a named hypothesis, which the floor diagnostic may or may not supply; (C) only with a priced plan
for distinct roots and their verification. No bank is designed before the final catalogue. See IG-S-Q23.

### IG-S-D4: outer concurrency of the improve-generating qualification

Options: (A) inner width four and outer `--jobs=1` for paired timing and budget verdicts, with serial controls at
outer `--jobs=1`; (B) another fixed, non-oversubscribed outer concurrency. Analysts: **(A)**; any throughput study is
separate. It refines IG-S-Q02 and does not alter difficulty-v3's qualification, its sample counts or the 120 s
request-wall guard. (See also IG-S-Q22.)

Plan-author answer: **(A).**

Inner width four and outer `--jobs=1` for paired timing and budget verdicts, serial controls at outer
`--jobs=1`, and any throughput study kept apart. See IG-S-Q22.

### IG-S-D5: the reduced frozen-round scope

Options: (A) a reduced staged frozen round (compatible baseline reuse, the missing work telemetry, selective S5a and
SM5, targeted profiles, S7 tails and a conditional Hell 1 floor diagnostic; the passing-cell Nightmare screen and the
attempt sweep retired); (B) the old full package; (C) deferral. Analysts: **(A)**; cohorts of 20 or more are a costed
proposal, not a replacement for official qualification; machine time approved only after the repair. (See also
IG-S-Q24.)

Plan-author answer: **(A).**

The reduced staged round, F0 to F6 of the joint report, each step with its stop condition. The passing-cell
Nightmare screen and the attempt sweep are retired; they return only for a cell that fails on the final
catalogue. Cohorts of 20 or more are a proposal to cost (IG-S-Q24), and machine time is approved only after the
repair of IG-S-D2.

### IG-S-D6: an early SM5 run before the freeze (analysts disagree)

Options: (A) wait for the freeze (Astra; the default); (B) a separately approved, bounded preliminary run on a named
current source with a mandatory frozen recheck (Opus, when resources permit). There is no joint request to execute
it now. (See also IG-S-Q25.)

Plan-author answer: **(A): wait for the freeze.**

I side with Astra here; the reasons are under IG-S-Q25. (B) only if the pool design names a decision that the
early numbers would change.

---

## Owner decisions (2026-11-15, after the plan author's positions; through `ask_user` and email)

The owner approved all six decisions as the plan author and the analysts recommend, with the plan author's
conditions as written in each answer above.

| Id | Decision |
|---|---|
| IG-S-D1 (OD-S5) | **(B)** selective pooling up to four workers with an early-hit path (head start or serial where the cell hits early) and a serial fallback; default enablement only after the frozen CPU, cold-wall and ready-wall results; a phone-class check before mobile enablement. Replaces plan section 7's "accept, up to 1.6 times". |
| IG-S-D2 (D10/A8) | **(B)** a narrowed, separately costed harness repair after MS18e on the attested frozen source, with actual native and no-op puzzle parity and no fallback to the old engine; the measurement round is priced only afterwards; no provisional time carries over. |
| IG-S-D3 (OD-S3) | **(A)** bounded diagnosis while Hell 1 stays unoffered; (B) only with a named hypothesis, (C) only with a priced plan; no bank designed before the final catalogue. |
| IG-S-D4 | **(A)** inner width four and outer `--jobs=1` for paired timing and budget verdicts, serial controls at outer `--jobs=1`; any throughput study kept apart; difficulty-v3's qualification unchanged. |
| IG-S-D5 | **(A)** the reduced staged frozen round (F0 to F6 of the joint report, each with its stop condition); the passing-cell Nightmare screen and the attempt sweep retired; cohorts of 20 or more costed after the repair. |
| IG-S-D6 | **(A)** no preliminary SM5 before the freeze. |

---

## Plan version 3 (plan author, 2026-11-15)

`plan.md` is revised to version 3 from the joint report on version 2, the answers IG-S-Q19 to IG-S-Q25 and the
owner decisions IG-S-D1 to IG-S-D6. It is one current document: the "version 2" notes and the section 9
addendum are merged into their sections, and version 2 stays at commit `adb7184`, where the full mechanism
text of the parked and dropped items remains. It ran nothing; the gate remains `not-evaluable-pre-freeze`.

- **Changed:** the targets re-derived on the rating-v3 checkpoint (section 2); S1, S2, the Nightmare screen
  and the attempt sweep out of the mandatory scope; S5a selective with a mandatory early-hit path; no kernel
  factor priced (K2 conditional, K4 a diagnostic, K1 and the chain work parked, K3 and K5 dropped); the
  contract boundary of IG-S-Q19 (section 3.1); the kernel gate of IG-S-Q20 (section 5.4); the reduced staged
  frozen round F0 to F6 after the narrowed repair (section 5).
- **Corrections:** JV2-S01 to JV2-S16 are taken in; the "220 to 590 points" window is withdrawn.
- **Still to come to the owner:** the cost of the repair and the round's price after MS18e, OD-S1 and OD-S2
  before phase 2, the pool's enablement after F2, and Hell 1's route after F5 (plan section 7).

---

## Questions and corrections after plan version 3 (analysts, 2026-11-15)

Raised by the analysts' review of plan version 3 (`plan.md` at `2278b61`): phase-1 analyses
`claude-opus-5.5/5-plan-v3-analysis.md` and `gpt-6-astra/5-plan-v3-analysis.md`, cross-reviews `6-*`, and the
joint report [plan-v3-joint-report.md](plan-v3-joint-report.md) (written by Astra, signed off by Opus). Both
analysts support the direction of version 3 and agree on the two questions below; neither needs a run to be
answered. **No owner decision is needed**; IG-S-D1 to IG-S-D6 remain in force.

- **Corrections for the next revision:** the joint report's section 3 gives them as exact text: butterfly Hell 1's
  phase-1 scenario 19.5-23.8 s becomes **11.2-19.1 s** (a four-attempt board; section 4), the "real-tier" wording
  of the passing cells, Q's relation to MS08a (Skyscraper, 66 of 520 hashes), the workers sentence, an optional
  K2 admission note, and the outcome-reuse rule of section 5.3 (JV3-S03).
- **Findings:** JV3-S01 to JV3-S09 (2 Medium, 7 Low) in the joint report's section 2.
- **Line numbers** in the joint report refer to `plan.md` at `2278b61`, before the cleanup below; the quoted text
  identifies each place.
- **Cleanup at the owner's request** ("xóa bớt những phần thừa trong plan v1 và v2 nếu không cần thiết"),
  executed by the orchestrator with only what both analysts support (joint report section 7):
  - `plan.md`: section 0 "What version 3 changes" and one history sentence of the header removed (494 to 472
    lines); the two links into `../difficulty-v3/` pinned to `75b99e6`, where those files exist; no content that
    binds a phase, a gate or a decision was cut;
  - deleted: `claude-opus-5.5/1-speed-summary.md` and `gpt-6-astra/1-speed-summary.md` (superseded duplicate
    tables; at `2278b61`), with the links to them pinned to that commit;
  - kept: `report.md` (its plan link pinned to `8c5bc25`, version 1 as reviewed), the analysts' 1-* to 4-*
    files, `plan-v2-joint-report.md`, this log, `evidence/` and `tasks/improve-generating/`.
### IG-S-Q26: Where and against which arms do the confirmation cohorts run?

*Joint. Blocks: the frozen manifest's arm matrix, price and the evidence required before pool enablement.*

**Context.** F2 names native and widths 1, 2 and 4. Section 5.3 separately proposes 20 or more paired requests
on Greater-Than Master, Killer Master and Nightmare, diagonalX Hell 1, samurai Hell 1, and mega16 Nightmare
if still unqualified, plus classic9 and mega12 Nightmare controls. Cells are fixed after F1; the confirmation
has no assigned F step or arm matrix. F6's kernel-only gate has a different comparator.

**Question.** Where do these confirmations sit, which arms and control counts run, and when are the
per-cell early-hit policy and warm/cold operating protocol frozen?

**Options.** (a) All four F2 arms on every confirmation seed. (b) A small F2 width/policy pilot, then held-out
width-one/width-four confirmation after F5 and before F6. (c) Confirmation only of later admitted F6 work,
with separately specified evidence still required for S5a enablement.

**Joint recommendation.** (b): about five pilot seeds per cell as a costed proposal, then at least twenty
independent held-out pairs for the selected, admitted confirmation cells; keep native/no-op and width
invariance checks. Fix the chosen policy before confirmation. Retain the bounded diagnostic purpose for
unoffered Hell cells; their inclusion is not a wider live-search programme. A later kernel confirmation is
separately priced against the same post-phase-2 generator, quotas and pool, not against serial S5a.

**Price/gate effect.** Four full arms mean 80 executions per cell at twenty seeds; a two-arm confirmation
means 40 plus the pilot (Derived counts, not a wall-time saving). The manifest must price every command,
population, startup, validation, grace and cleanup. No preliminary SM5 is authorised and the official
40-request qualification population is unchanged.

Plan-author answer:

### IG-S-Q27: Which tolerance and CPU statistic bind the kernel controls?

*Joint. Blocks: fixing the kernel evaluation protocol after F3, before evaluating an optimisation.*

**Context.** Section 5.4 uses the per-cell geometric mean of paired ready-wall reference/new ratios,
thresholds 1.5 or 1.15 on targets, at least 0.95 on named controls, and “CPU may not rise”.
S5a separately retains strict serial non-regression. At 0.95, new wall time may be about 5.26% higher.

**Question.** Is the 0.95 tolerance expressly limited to the named kernel comparison, distinct from the
pool's width-one check? Which per-cell CPU aggregation and threshold bind: a paired geometric mean,
cohort totals or a specified bound?

**Options.** (a) Explicitly separate the kernel-control tolerance from S5a's serial check, and define the
CPU statistic and threshold. (b) Use strict >=1 wall/CPU ratios on both. (c) State another predeclared
confidence/tolerance rule and its scope.

**Joint recommendation.** State the scope now, and fix the exact CPU statistic with the targets/controls
after F3 and before evaluation, as section 5.4 already requires. Report CPU including speculation and cold
wall separately. Do not select the best-looking aggregation after seeing results or implicitly relax an
owner-bound serial condition.

**Price/gate effect.** This does not authorise another run; it prevents an ambiguous pass/fail verdict or
an avoidable repeat of a wrongly specified comparison.

Plan-author answer:
