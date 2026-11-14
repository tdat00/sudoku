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

Plan-author answer:

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

Plan-author answer:

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

Plan-author answer:

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

Plan-author answer:

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

Plan-author answer:

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

Plan-author answer:

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

Plan-author answer:

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

Plan-author answer:

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

Plan-author answer:

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

Plan-author answer:

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

Plan-author answer:

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

Plan-author answer:

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

Plan-author answer:

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

Plan-author answer:

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

Plan-author answer:

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

Plan-author answer:
