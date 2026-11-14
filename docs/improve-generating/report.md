# Improve generating (Sudoku): joint analysis report on the plan

| Field | Value |
|---|---|
| Plan | [plan.md](plan.md), by Fable |
| Analysts | SA1 claude-opus-5.5 ("Opus", lead of this report) and SA2 gpt-6-astra ("Astra", reviewer of this report) |
| Source | Analyses made against `f7be90f` (the difficulty-v3 recovery MS05: 8 / 4 / 2 attempts, allowance 256, requiredness). The worktree is now at `ef8a9cc`, which adds or changes only documents, task files, the MS05e evidence and six MS05e measurement scripts (`generator/tests/artifacts/difficulty-v3/MS05e/`); no runtime file changed (the MS05e candidate was restored byte for byte), so the source analysed is unchanged |
| Detail | Opus: [1-analysis](claude-opus-5.5/1-analysis.md), [1-speed-summary](claude-opus-5.5/1-speed-summary.md), [2-cross-review](claude-opus-5.5/2-cross-review.md). Astra: [1-analysis](gpt-6-astra/1-analysis.md), [1-speed-summary](gpt-6-astra/1-speed-summary.md), [2-cross-review](gpt-6-astra/2-cross-review.md) |
| Questions | [clarifications.md](clarifications.md): IG-S-Q01 to IG-S-Q16, blocking ones first |

**Every number after "today" is an estimate. Nothing was run for this report or for the analyses behind it: no
generation, test, benchmark, qualification or timing.** "Today" is Measured on the EPYC bench and committed (MS05r4,
MS05r5m, MS05b3, MS05r6b); the rest is Derived arithmetic on that evidence or a Projection with stated assumptions.
**One exception:** §7 also quotes the MS05e and CV6-05 evidence, committed in `ef8a9cc` after the analyses were made
(paths in §7); Opus read it, Astra did not review it. Where this report and a phase-1 or phase-2 file disagree, this
report holds (§8).

---

## 1. Summary

- **The plan's direction is right; its headline numbers are too high.** Both analysts reject the plan's projection
  that mega16 Nightmare's sample batch falls from 97 s to about 1.6 s (plan §4). A frontier sample (S1) still makes one
  floor test per symmetry group, a uniqueness check per refused group and 8 to 16 full solves, and the plan also
  replaces today's cheap proposal samples by frontier samples. Today a sample costs about 25 canonical-rating
  equivalents on classic9, about 50 on mega12 and about 185 on mega16 (cost equivalents, not solve counts), against the
  plan's 1,296 solves.
- **Planning midpoints for a request at the default work** (the mean of the two analysts' final values, both shown in
  §2; not a consensus forecast): mega16 Nightmare 104 s → 39 s after the first phases → 11 s after all phases (scenario
  envelope 3 to 44 s); mega12 24 → 5.4 → 4.6 s; the four multigrids 23 to 33 → 7.6 to 10.6 → 4.8 to 5.7 s; classic9
  4.9 → 1.2 → 1.2 s; Killer and Greater-Than about 4 times from S3, S4 and the pool alone.
- **Most of the safe gain comes first.** The first phases (S3 with cap parity, S4, S5a) give about 4 times on the 8- and
  4-attempt boards and about 2.6 times on the two-attempt boards (mega16, samurai, sohei, flower), where two attempts
  cap the pool for the serial local search.
- **S1 is a hit-rate lever on 81 to 144 cells, not a speed lever:** the time per sample stays about the same and can
  regress; on mega16 it falls to about a third. S1's effect on exact hits (p) is unmeasured; SM2 decides it.
- **Availability:** no cell becomes offerable on these estimates. Timing becomes plausible for mega12, mega16 and the
  multigrids at Nightmare; their exact hits (0 of 7 and 0 of 2 today) depend on S1's unmeasured p.
- **Correctness:** the equal-result phases need budget-check accounting (S3, S10); S9's Killer and Greater-Than
  transformations break cages and signs; a capped uniqueness count must stay "unknown"; no generator-algorithm version
  exists anywhere yet.
- **Measure first:** SM1 profiles of today's paths plus restricted-floor probes, then a small S1 and S2 feasibility
  prototype (SM2), before the large S3 rewrite.

| Headline cell (attempts) | Today median / p95, s | After first phases (equal results) | After all phases (midpoint) | Speed-up | Opus; Astra (all phases, median) | Envelope after all | Confidence |
|---|---|---|---|---|---|---|---|
| mega16 Nightmare (2) | 104.1 / 117.0 | 39 / 50 | 11 / 14 | 9.5 x | 10.1; 11.8 | 3.3 - 44 | low |
| mega12 Nightmare (4) | 23.7 / 25.2 | 5.4 / 7.2 | 4.6 / 5.9 | 5.2 x | 4.3; 4.85 | 1.0 - 15 | low |
| samurai Nightmare (2) | 26.7 | 10.3 / 11.6 | 5.6 / 6.5 | 4.8 x | 4.8; 6.4 | 1.9 - 19 | low |
| classic9 Nightmare (8) | 4.91 / 5.72 | 1.17 / 1.7 | 1.2 / 1.7 | 4.1 x | 1.09; 1.31 | 0.38 - 3.2 | low (Opus: medium for the first phases) |
| Killer Nightmare (8) | 17.8 / 30.0 | 4.5 / 9.8 | 4.5 / 9.8 | 4.0 x | 4.4; 4.51 | 2.8 - 17.9 | low (Opus: medium) |
| Greater-Than Nightmare (8) | 9.3 / 19.2 | 2.2 / 6.0 | 2.2 / 6.0 | 4.2 x | 2.1; 2.37 | 1.2 - 9.4 | low (Opus: medium) |

---

## 2. Speed, before and after

Reading rules.

- *Today:* Measured request times at the default work, Node on the EPYC 7763 bench. The R5 and deep Nightmare cells are
  mostly requests without an exact hit (10 of 12 and 7 of 7), so they show what a failing request pays; I5 and CV3
  include the requests that hit. Sources: **R5** = MS05r4 R5 cell, n = 12 (`docs/difficulty-v3/evidence/MS05r4/selection.json`);
  **I5** = MS05b3 per-request I5 (`docs/difficulty-v3/evidence/MS05b3/outcomes.json`); **deep** = MS05r5m, n = 7
  (`docs/difficulty-v3/evidence/MS05r5m/records/`); **CV3** = MS05b3 CV3, the larger of two requests.
- *First phases* = plan phases 1 and 2. Equal results are claimed only for S3 with cap parity (IG-S-Q03), S4's boolean
  refusal (its log is a separate contract, IG-S-Q04) and S5a on requests that complete without censoring. S7's
  triggered changes belong to the version (IG-S-Q07); S6 adds no speed and can return a puzzle only from a complete
  verified checkpoint.
- *All phases* = plus phase 3 (S1, S2, S5b), for a cold, fresh request. S8, S9 and S10 are not included.
- *Midpoint* = the mean of Opus's values (repriced in this report; see the model below) and Astra's final values
  ([her 2-cross-review §5](gpt-6-astra/2-cross-review.md)): an editorial planning midpoint, not a consensus forecast or
  the median of a distribution. *Envelope* = the union of both analysts' high-benefit to low-benefit median scenarios;
  not a confidence interval.
- *Confidence* of every future number is low, very low for boards transferred from samurai. Astra holds that agreement
  between two projections does not raise it; Opus would rate the first phases medium where both agree and the mechanism
  is in the code, as marked.

| Cell (attempts) | Today median / p95 (source); exact hits | After first phases | After all phases | Speed-up (all) | Envelope after all | Confidence | Opus; Astra after all, and why they differ |
|---|---|---|---|---|---|---|---|
| classic9 Nightmare (8) | 4.91 / 5.72 (R5); 21 / 100 (GD) | 1.17 / 1.7 | 1.2 / 1.7 | 4.1 x | 0.38 - 3.2 | low (Opus: medium for the first phases) | 1.09; 1.31: S1 divisor 1.0 against 0.9; on the local search Opus's S3-only 1.5 against Astra's 1.3 |
| wordoku Nightmare (8) | 4.96 / 5.49 (I5); 4 / 20 | 1.18 / 1.6 | 1.2 / 1.6 | 4.1 x | 0.39 - 3.2 | low | 1.10; 1.32: as classic9, its shares transferred |
| Killer Hard (8) | 4.75 / 6.47 (I5); 0 / 20 | 1.2 / 2.2 | 1.2 / 2.2 | 3.9 x | 0.8 - 4.8 | low (Opus: medium) | 1.2; 1.24: Opus S3 1.45 times pool 2.8 (p95 2.2); Astra a whole-request divisor 4 (tail 3) |
| Killer Expert (8) | 10.81 / 14.74 (I5); 1 / 8 | 2.7 / 4.9 | 2.7 / 4.9 | 4.0 x | 1.7 - 10.8 | low (Opus: medium) | 2.7; 2.75: as Killer Hard |
| Killer Master (8) | 12.45 / 23.36 (I5); 2 / 8 | 3.1 / 7.6 | 3.1 / 7.6 | 4.0 x | 2.0 - 12.5 | low (Opus: medium) | 3.1; 3.16: as Killer Hard |
| Killer Nightmare (8) | 17.82 / 29.98 (I5); 1 / 8 | 4.5 / 9.8 | 4.5 / 9.8 | 4.0 x | 2.8 - 17.9 | low (Opus: medium) | 4.4; 4.51: as Killer Hard |
| Jigsaw Expert (8) | 0.92 / 2.44, max 325 (I5) | 0.52 / 1.4 | 0.52 / 1.4 | 1.8 x | 0.17 - 0.92 | low; the 325 s tail unknown (S7, SM3) | 0.42; 0.61: Opus pools the attempts, Astra keeps one lane for early-hit cells |
| Jigsaw Nightmare (8) | 0.95 / 2.33 (I5) | 0.53 / 1.3 | 0.53 / 1.3 | 1.8 x | 0.12 - 0.95 | low | 0.43; 0.64: as Jigsaw Expert |
| Greater-Than Expert (8) | 2.40 / 14.20 (I5) | 0.61 / 4.4 | 0.61 / 4.4 | 3.9 x | 0.3 - 2.4 | low (Opus: medium) | 0.57; 0.65: Opus S3 x S4 1.65 times pool 2.8 (p95 2.2); Astra a whole-request divisor 4 (tail 3) |
| Greater-Than Nightmare (8) | 9.30 / 19.19 (I5) | 2.2 / 6.0 | 2.2 / 6.0 | 4.2 x | 1.2 - 9.4 | low (Opus: medium) | 2.1; 2.37: as Greater-Than Expert |
| mega12 Nightmare (4) | 23.72 / 25.24 (deep); 0 / 7 | 5.4 / 7.2 | 4.6 / 5.9 | 5.2 x | 1.0 - 15 | low | 4.3; 4.85: same S1 divisor (1.2); S3 credit |
| mega16 Nightmare (2) | 104.11 / 116.95 (deep); 0 / 7 | 39 / 50 | 11 / 14 | 9.5 x | 3.3 - 44 | low | 10.1; 11.8: same S1 divisor (3); Astra's lower S3 credit (1.45 on samples, 1.3 on the local search) and wider low case |
| samurai Nightmare (2) | 26.74 (CV3); 0 / 2 | 10.3 / 11.6 | 5.6 / 6.5 | 4.8 x | 1.9 - 19 | low | 4.8; 6.4: S1 divisor 2 against 1.5 (G13 proxy) |
| sohei Nightmare (2) | 27.49 (CV3); 0 / 2 | 10.6 / 12.0 | 5.7 / 6.7 | 4.8 x | 2.0 - 19 | very low | 4.9; 6.58: as samurai, shares transferred from G13 |
| flower Nightmare (2) | 23.07 (CV3); 0 / 2 | 8.9 / 10.1 | 4.8 / 5.6 | 4.8 x | 1.7 - 16 | very low | 4.1; 5.53: as sohei |
| butterfly Nightmare (4) | 32.82 (CV3); 0 / 2 | 7.6 / 9.4 | 5.7 / 7.1 | 5.7 x | 1.7 - 20 | very low | 5.4; 6.04: as sohei, four attempts |
| Hard to Master: classic9, Jigsaw, mega12, mega16, multigrids | 0.019 - 3.05 / 0.068 - 3.05 (CV3, I5, R5) | x 1.5 - 2.5 | unchanged: S1 stays off | x 1.5 - 2.5 | x 1 - 4 | low | Opus x 2 - 2.5 on the median (S3 on easier solves) and the pool on the p95; Astra x 1.5 on one lane (a pool cannot speed a request that ends in its first sample) |
| Hell 1, every board | 0.04 - 5.2, vacuous tier (CV3) | not comparable | no estimate; the Nightmare row x 1 - 4 as a sensitivity once MS07b gives a tier | | | very low | agree: no defensible number |

**The model, in one paragraph.** Both analysts now use one structure (Astra's [2-cross-review §4](gpt-6-astra/2-cross-review.md),
Opus's [2-cross-review §1](claude-opus-5.5/2-cross-review.md)): a request is sample work plus a serial local search, one
per attempt (`generator/js/engine/digger.js:1936-1947`). The first phases divide the sample-side solves by S3 x S4 (S4
acts only on bounded removal oracles), the local search by S3 alone (its canonical ratings must finish), and the
attempts by min(4, attempts); all phases also divide the samples by S1 + S2's per-sample factor and by the four-worker
pool (S5b). The local search never runs wider than the number of attempts: at most 2 on the two-attempt boards. Sample
shares: 90 % of mega16's profiled request, 83 % of mega12's and 72 % of samurai G13's (Derived from the MS05r5p
profiles); about 53 % of classic9's, a fitted component share from a regression over the R5 rows (a Projection, not a
direct timing). The S1 + S2 divisor (reconciled; Astra had 5 to 8, Opus 0.8 to 2.5) is **about 1 on 81 cells, 1.2 on
144, 1.5 to 2 on the multigrids and 3 on mega16** (range 0.6 to 8): a frontier sample costs about as much as today's
sample on 81 to 144 cells and about a third of it on mega16 ([Opus's 2-cross-review §1.2](claude-opus-5.5/2-cross-review.md)).
Killer and Greater-Than get no S1 credit. Opus's values here are repriced from his 2-cross-review with S3 alone (1.5)
on the local search instead of S3 x S4 (1.65).

---

## 3. Availability (exact hits), separate from speed

| Cell | Exact today (Measured) | After first phases | After all phases | What it depends on |
|---|---|---|---|---|
| classic9, wordoku Nightmare | 21 / 100 (GD), 4 / 20 (I5) | unchanged at 8 attempts | unchanged unless S1 raises p | about ten times more effective attempts for 90 % (both). With more attempts (OD-S4): Opus's sensitivity, about 72 attempts by median time inside 10 s and about 88 %; Astra's contrasting sensitivity, about 45 attempts by a projected p95 and about 73 %. Neither is established: both assume linear scaling and independent equal-yield attempts. The UI allows at most 20 attempts (`generator/js/ui/store.js:38`), and defaults, recipes and history must stay compatible. Both analysts support the measurement sweep only |
| mega12, mega16 Nightmare | 0 / 7 each (deep) | unchanged | unknown | S1's p multiplier, which nobody has measured. Opus's conditional model: a per-attempt gain of about 4 to 5 (mega12) and 4 to 6.6 (mega16) reaches 90 % inside 30 s. Astra: conditional only; the per-attempt rates are assumed, and the one mega16 hit came from local search, which a per-sample gain need not multiply |
| samurai, sohei, flower, butterfly Nightmare | 0 / 2 each (CV3) | unchanged | unknown | as mega16; Opus's conditional gain about 5 to 8 |
| Killer Hard to Nightmare | 0 / 20, 1 / 8, 2 / 8, 1 / 8 (I5) | unchanged | unchanged with S1 opted out | equal-cost optimisation does not fix count-limited misses; whether search or calibration (MS07e) is the remedy remains an owner question |
| Greater-Than, Jigsaw | 90 % or more (I5) | preserved | preserved | time only. Only S5's contribution depends on the pool protocol (IG-S-Q02): kernel work alone might bring Greater-Than Expert's p95 under 10 s in some scenarios; Nightmare's serial projections still miss it |
| Hell 1, every board | vacuous today | unknown | unknown | MS07b's tier; no non-vacuous baseline exists |

Shared verdict: timing eligibility becomes plausible for the large Nightmare cells; exact availability stays
unmeasured. SM2 must report sample-origin and local-origin hits apart. S9 (bank) is the plan's fallback for cells that
stay below 90 % after phase 3.

---

## 4. Per plan item

| Item | Expected gain (both analysts) | Same puzzles? | Main risks | Measure before / after |
|---|---|---|---|---|
| S1 frontier dig | time per sample divided by about 1 (81 cells), 1.2 (144), 1.5 - 2 (multigrids), 3 (mega16); range 0.6 - 8. Hit rate p unmeasured | no: new algorithm version (OD-S1) | §5 items 3 to 5; the ladder of floors re-tests refused groups; scope by level and Killer (IG-S-Q11) | before: SM1 profiles, restricted-floor probes and SM2 (p and time per sample against each current kind); after: qualification of every changed cell |
| S2 early exit | inside S1's divisor; shortens accepted floor tests only, not refused fixpoints, DFS or verification | no | candidate restoration; `assumeUniqueness: false` | SM2, S1 alone against S1 + S2 |
| S3 event-driven ladder | x 1.3 - 1.65 on solve work (1.0 - 2.75); the plan's 3 - 10 x is for the non-chain part only | only with cap parity (virtual budget checks) | §5 item 1; footprints of placements, Nishio, Rule of 45, inequality chains | before: SM4 with the check sequence; time per solve on 81, 144, 256 cells |
| S4 monotone exit | x 1.0 - 1.1 on bounded removal oracles only | the boolean refusal yes; dig-log reasons change | §5 item 2 | SM4; IG-S-Q04 |
| S5a attempts on workers | x 2.8 - 3.0 on 8- and 4-attempt boards; x 1.7 - 1.8 on two-attempt boards | yes, by ordered merge, on uncensored requests | §5 item 7; qualification is serial | SM5 at 1, 2, 4 workers; IG-S-Q02 |
| S5b samples on workers | x 3 on the samples; nothing on the local search | no | quota ownership; model transfer with cage and inequality setup (`pipeline.js:269-365`) | SM5, samples and local search timed apart |
| S6 anytime result | none on compute; a puzzle at the guard only from a complete verified checkpoint, otherwise still no result | behaviour change, device-dependent | §5 item 8 | time-guard tests; IG-S-Q13 |
| S7 bounds | tails only; the stage behind the 325 s Jigsaw request is unknown | no where it triggers: version | §5 item 9 | SM3; IG-S-Q07 |
| S8 stock | perceived time on a stock hit only | yes | `SG.cache` already pre-generates; stale `COSTS`; explicit seeds never served | hit ratio and latency; IG-S-Q14 |
| S9 seed bank | one to a few ratings per request, about 0.05 - 0.25 s on the large boards (Astra) | content (OD-S3) | §5 item 6; finite diversity; bank version in the identity | bank acceptance; IG-S-Q15 |
| S10 WebAssembly | x 1.2 - 2 on the remaining kernel share; likely below the plan's 1.5 x whole-request gate | only with DFS and chain check accounting | §5 item 1 (DFS guards) | SM1 after phase 3 |

---

## 5. Correctness risks, merged

1. **Budget-check identity (S3, S10).** `OBJECTIVE_STEPS` (100,000; `digger.js:659, 711-728`) and Killer's
   `ANALYSIS_NODES` slices for layout ratings (`generator/js/variants/killer.js:469, 483-490, 836-854`) count the
   finders' `budget.check()` calls, which S3's skipped scopes change. `REPAIR_NODES` (`killer.js:471, 695-745`) and
   `UNIQUE_NODES` (`digger.js:653`) count DFS work: S10 reaches them, S3 does not. Equal traces under an unlimited budget
   do not prove equal capped generation: keep virtual charges and failure boundaries, or move the change under the
   version.
2. **S4 changes refusal reasons** (`techniques` becomes `tooHard`) in the dig log and Generation Steps, which the
   regression hashes do not cover.
3. **S1 soundness.** Floor tests run with `assumeUniqueness: false` (`digger.js:293-316`); a capped uniqueness count is
   "unknown", never "not unique, final" (Killer already returns `unknown`, `killer.js:522`); frontier entries are
   validated against an explicit reference parent; restored candidates need their support recomputed from all givens
   (`core/js/engine/constraints.js:353-390`); an empty tier has no frontier (keep the vacuous treatment); exactness
   still comes only from the canonical rating and `requiredOf`.
4. **S1 reaches Killer's cell dig** through `digStage` (`killer.js:1010-1019`): Killer's puzzles change unless it is
   excluded, while its structure work may dominate its time (the complete split is not measured).
5. **Replay.** A new frontier pass would be labelled `random` (`generator/js/engine/replay.js:372-376`) and tell the
   wrong generation story; the `random` first-pass check at `replay.js:180` belongs to Killer's rebuilt log only. Wires
   G09-G13 and analyses G01-G14 change with the version.
6. **S9 transformations.** Row and band permutations break Killer cage connectivity (`killer.js:212`, `isConnected`
   `killer.js:528`) and Greater-Than sign adjacency (`generator/js/variants/greater-than.js:21`). Only geometric
   symmetries keep both, or each derived puzzle must be validated.
7. **S5 pool.** The ordered merge must reproduce "first strictly better", the keeper and its `unsound` warning;
   per-attempt keepers count more candidates; `file://` keeps one lane; the 120 s guard counts active worker time today.
8. **S6.** A device-dependent result breaks the cache's background regeneration (`generator/js/ui/cache.js:5-13`) and
   history picks; an absent wire `exact` reads as false (`generator/js/engine/pipeline.js:336-351`); the keeper's state
   is private to a worker, and terminating the worker cannot recover it.
9. **S7.** A ceiling that never triggers on the corpus still changes other seeds; the full-grid search is unlimited from
   its 50th restart (`generator/js/engine/full-grid.js:241-261`), so the total must be bounded.
10. **Versions and storage.** No generator-algorithm version exists in history (configuration only), the cache key or
    the wires (version 1); the 20-entry cache (`cache.js:49`) cannot back the 100-entry history (`history.js:20`).

---

## 6. Measurement plan

In this order; nothing here has been run.

1. **Freeze** on the final difficulty-v3 catalogue (after MS18e) and record the identities: engine, catalogue, rating,
   cache, attempts, allowance, target policy, offered cells.
2. **SM1** profiles today's oracle, proposal, rating and local-search paths per sample kind and stage, with budget
   checks per solve; for the local search, `firstShallowAt`, the cap reason, ratings and proposals (the 256 allowance
   starts only after the first shallow state; a frontier may push the local search towards the 1,024-rating ceiling).
   Restricted-floor and prefix probes then estimate the new test costs (accepted and refused floor tests per floor
   level, DFS checks) without any production S1 integration.
3. **SM2 early.** Opus: in phase 0; Astra: a small S1 and S2 feasibility prototype before the S3 rewrite. Both: p and
   time per sample against each current kind and a proposal-only control; sample-origin and local-origin hits apart.
   Gate: Opus, a per-cell break-even gain; Astra, absolute verified hits per CPU and wall second with seed-clustered
   uncertainty and non-inferiority controls, as an early feasibility gate beside, not instead of, request-level
   qualification. Not the plan's ratio over zero observed hits.
4. **SM4**: S3 equality of steps and of the budget-check sequence, with guard-binding cases (the mega16 Hell 2 request
   that `OBJECTIVE_STEPS` cut from 106 s to 8 s, Killer Expert layouts).
5. **SM5**: 1, 2 and 4 workers; on mega16 (two attempts), samples and local search timed apart; cancellation, memory,
   cold and warm.
6. **SM3**: the stage of the 325 s Jigsaw Expert request.
7. **More attempts (OD-S4)**: classic9 and wordoku Nightmare with 16, 32 and 64 attempts after phase 2, judged on p95
   time and exact hits; decide the UI's 20-attempt ceiling and recipe compatibility first.
8. **Greater-Than**: MS05e's miss predicate, whole-pass cost and local work, measured before any sign guidance (§7).

The 88 % (Opus) and 73 % (Astra) OD-S4 figures are contrasting sensitivities, not predictions; both analysts support
the sweep, and the two gate forms can be reported side by side.

---

## 7. Interaction with difficulty-v3

- **The baseline moves.** MS06 adds the target policy and `tierUsed`; MS07 changes tiers and weights
  (`forcingChainLong` 1,400 in the Nightmare tier, `nishioDeep` 2,600 for Hell 1; the Nightmare score window widens from
  about 220 to about 590 points, which may move p more than S1 does); MS08 to MS16 add about 14 finders; MS17b moves
  rating and cache to version 3. Every "today" above is the committed evidence as analysed at `f7be90f`; `ef8a9cc`
  changes no runtime file. Factors transfer better than seconds; SM1 re-measures the baseline.
- **No generator-version field.** History stores configurations only, the cache key has no algorithm, the wires are
  version 1. OD-S1 needs a home for the version (IG-S-Q01) before phase 3, and before S6 or S7 ship. The rating version 3
  stays separate from the generator, bank and stock versions.
- **MS05e and CV6-05: committed in `ef8a9cc`, read by Opus only.** Fable's answer today (CV6-05, Q1(b), now in
  `docs/difficulty-v3/clarifications-resolved.md`) set aside MS05e's guided sign pool for Greater-Than. The report
  `docs/difficulty-v3/cv6-guided-sign-dig-2026-11-14.md`, its evidence `docs/difficulty-v3/evidence/MS05e/` (with the
  set-aside candidate `candidate-pool-4.patch`) and the difficulty-v3 SA1 review
  `docs/difficulty-v3/claude-opus-5.5/11-review-of-ms05e.md` are committed in `ef8a9cc`, after these analyses. Their
  recorded "before" and restored source is `f7be90f` (`greater-than.js` `24dbbe37...`, engine `a073f9bd...`), the
  source these analyses were made against; the set-aside candidate is `greater-than.js` `daecf790...`
  (`SIGN_POOL = 4`). Astra has not reviewed this evidence and endorses no number from it. What it records, as far as it
  bears on the plan:
  - *Whole-pass cost.* Rating `SIGN_POOL` candidates per removal raised the sign ratings per removal from 1.15 to 4.0,
    7.8 and 14.9 (pools 4, 8, 16) and the oracle calls per request on Normal 300-319 by 4.5, 5.8 and 9.4 times. Normal
    CV6 p95 went from 5.2 to 17.0 s and Nightmare CV6 from 19.2 to 40.4 s, while the dug samples per exact request fell
    on most cohorts (by up to about half at pool 16) and rose on some. The shared lesson: price complete passes,
    escalations and rejected work against the exact outcome, as §2 does for S1.
  - *End states of the misses (IR23).* On Greater-Than Normal 300-319, 83 of 376 misses (22.1 %) ended below the band at
    the clue floor; 187 (49.7 %) were setups already two or more clues above the floor; 85 (22.6 %) followed a tune
    reveal; 21 (5.6 %) were shallow. CV6-05 concludes that the sign-only repair "was aimed at a fifth of the problem".
    Astra cautions that end-state shares are not intervention coverage: a sign change can affect other categories too.
    What holds the setup clues is not measured.
  - *Where the time went.* In that cohort the sample digs took 10.6 s of 39.7 s, and the requests that had a local search
    running to the proposal cap (21 such searches at 32,768 proposals) took 95 % of the cohort's time: request-group
    time, not local-stage time. This does not establish a finder, DFS or proposal split, nor rank S3, S5a or S7 above a
    dig change that avoids entering the continuation.
  - *The target.* Under CV6-05 the sign dig transports the target and does not consume it, so S1's `deepen` with MS06's
    target policy does not reach Greater-Than's sign strategy.
  - *IR29's lever* (count uniqueness only after a bounded solve gets stuck) was not authorised in difficulty-v3.
    Greater-Than's `solveWithin` already solves with `assumeUniqueness: false`
    (`generator/js/variants/greater-than.js:192-199`), so a sound-solve-first order can be tested; IG-S-Q16 asks
    whether it belongs in this feature.

---

## 8. Corrections to the phase-1 and phase-2 files

- **Opus.** `replay.js:180` is Killer's rebuilt-log check, not a general rejection of new passes; `REPAIR_NODES` counts
  DFS work, not finder checks; the minimum technique term of a one-Nishio puzzle is 2,125, not 2,135; S4 cannot act on
  canonical local ratings (repriced here with S3 alone on the local search); the plan's S9 list is not
  validity-preserving for Killer and Greater-Than; the 88 % for more attempts is a median-time sensitivity and needs
  more than the UI's 20 attempts; SM1's counters alone do not measure the new floor-test costs (restricted-floor probes
  and SM2 do); S1's "cost 1 to 3 times" was a divisor; "Killer's time is structure work" is not measured; MS05e's 22 % and
  95 % are end-state and request-group shares, not intervention coverage or stage time.
- **Astra.** The S1 + S2 divisors of 5 to 8 (now about 1 to 3), the pool on the serial local search of two-attempt
  boards (now at most 2), and classic9's sample share (0.65 assumed; now 0.53, a fitted projection).
