# Sudoku difficulty-v3 — review of MS05e, the guided sign dig for Greater-Than

| Field | Value |
|---|---|
| Reviewer | SA1 (agent Opus, claude-opus-5.5), the Sudoku cross-reviewer, under S-OD4 |
| Date | 2026-11-14 |
| Subject | MS05e, uncommitted on `rating-v3` at `f7be90f` (`git diff` and the untracked files) |
| Against | `tasks/difficulty-v3/MS05e-guided-sign-dig.md`; S-OD1 and CV6-01 (`docs/difficulty-v3/clarifications-resolved.md:551-691`); S-OD4 |
| Read | the code diff, the new suite, the three pinned suites, the report `docs/difficulty-v3/cv6-guided-sign-dig-2026-11-14.md`, and `docs/difficulty-v3/evidence/MS05e/`: every measure file, both diagnoses, `runs.jsonl`, the GD cells, the hash, wire and analysis ledgers, the logs |
| Ran | read-only scripts only: aggregation of the evidence JSON, source identities and fingerprints recomputed with the repository's own hashing rules, git reads. No test, no generation, nothing staged |

**Verdict: slowdown inherent to the pool.** The code does what S-OD1 step 2 specifies, and nothing more. Each rating
is one uniqueness count and one bounded solve, classified without a second solve. The extra cost is the re-rating of
the allowed losers, which the specified algorithm requires: about `SIGN_POOL` ratings per removed sign, against one
before. The measurements are sound, and E, GR and the pins are correct for the final source.

One Major finding concerns the diagnosis gate, not the code (IR23). By the plan's own definition, the named trap
(below the band at the clue floor) is only a fifth of the misses. Most misses end two or more clues above the floor,
and a sign-only dig never removes clues.

## 1. Point 1: a real slowdown, or an implementation flaw?

### 1.1 The code against S-OD1 step 2

| Check | Result | Where (`generator/js/variants/greater-than.js`) |
|---|---|---|
| Only the technique pass is replaced | Yes. `guidedPass(order, 'signs')` takes the place of `digPass(order, techniqueOracle, 'signs')`; `signs.minimal`, the reveals, `MAX_TUNE_ROUNDS`, the keeper and the final rating are unchanged | `:487-488` |
| One rating is the oracle's own work | `rateRemoval`: `uniqueOracle` (one count, one `oracleCalls`), then `solveWithin` once, then `classify(report, trial)`, which reads only the report's technique counts and score (`generator/js/engine/difficulty.js:485-516`). No second solve, no `requiredOf` | `:313-316`, `:326-335` |
| Refusal | ambiguous, stuck (`techniques`), or `score >= spec.max` (`tooHard`) | `:327-331` |
| A refused sign stays refused | The `refused` mask belongs to one `guidedPass` call: it holds for the pass and is new in every tune round | `:391`, `:395`, `:409` |
| Allowed losers rated again | Yes, by design: each pool is again the first `SIGN_POOL` live, unrefused signs of the shuffled order | `:393-396` |
| Comparator | `tierUsed` first, then the nearest finite `options.target`, else the higher score; `beats` is strict, so a tie keeps the encounter order | `:323-324`, `:348-352`, `:419` |
| `tierUsed` | any of `spec.tierTechniques` (defined, `difficulty.js:475`) in the solve's counts; vacuous at veryEasy and for an empty tier | `:323`, `:332-333` |
| Accounting | one `tried`, one `oracleCalls` and one `budget.check()` per rating; the inherited budget goes to both solvers; no random draw, cap or clock | `:402-403`, `:313-316`, `:199-206` |
| Rollback | `rateSign` puts the sign back in `finally` | `:338-345` |
| Log and events | `keep` (`cells`, `sign`, `score`) for every allowed member, the winner included; `reject` with its reason; `accept` for the winner alone; `dig.keep` is an existing event (`generator/js/engine/events.js:857`), and the cells dig also logs its winner as a `keep` | `:405-437` |

The new suite covers every focused case of the task (lines 228-241): the scripted comparator cases with the task's
own numbers, the three refusals and the reset in a later round, fewer live signs than the pool, a whole pool refused,
a loser rated again, "current set minus one sign" for every rating (`rec.problems`), one bounded solve and one
classification per allowed rating (`poolSolves` 3 and `classifies` 2 for four ratings), the budget's identity and
check count, an error and a cancellation, and sync, cooperative and logged identity on real seeds. A seeded script
is checked against an independent restatement of the rule
(`generator/tests/suites/greater-than-guided.test.js:334-394`).

### 1.2 Where the cost goes, from the evidence counters

Per dug sample, from the r1 measure files (`before/`, `pool-4/`, `pool-8/` and `pool-16/`; pool 16's split cohorts
merged). "Removals" is `accepted` (both passes), "ratings" is `tried`, "µs per call" is the sign-dig time over
`oracleCalls`, "dig share" is the sign-dig time over the request time, and "samples per hit" is the dug samples over
the exact requests. Repeat r2 has identical counters.

| Cohort | Source | Samples | Removals | Ratings | Oracle calls | µs per call | Dig ms | Dig share | Total s | Samples per hit |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Normal 300-319 | before | 394 | 102.9 | 117.9 | 119.2 | 224 | 26.7 | 26.5 % | 39.7 | 19.7 |
| Normal 300-319 | pool 4 | 504 | 103.1 | 414.0 | 415.3 | 228 | 94.9 | 53.3 % | 89.7 | 25.2 |
| Normal 300-319 | pool 8 | 341 | 103.0 | 803.2 | 804.5 | 234 | 188.0 | 72.8 % | 88.1 | 17.1 |
| Normal 300-319 | pool 16 | 287 | 103.2 | 1,536.9 | 1,538.2 | 240 | 368.4 | 87.3 % | 121.2 | 14.3 |
| Normal 7000-7039 | before | 1,399 | 102.9 | 118.1 | 119.4 | 216 | 25.8 | 22.0 % | 164.5 | 35.9 |
| Normal 7000-7039 | pool 4 | 945 | 102.9 | 413.3 | 414.5 | 229 | 94.7 | 53.6 % | 167.1 | 23.6 |
| Normal 7000-7039 | pool 8 | 831 | 102.9 | 801.7 | 802.9 | 234 | 188.2 | 69.6 % | 224.7 | 20.8 |
| Normal 7000-7039 | pool 16 | 678 | 103.0 | 1,535.4 | 1,536.7 | 237 | 364.1 | 83.6 % | 295.3 | 16.9 |
| Easy 300-319 | before | 22 | 106.5 | 109.8 | 110.9 | 201 | 22.3 | 94.8 % | 0.5 | 1.1 |
| Easy 300-319 | pool 4 | 22 | 106.5 | 421.7 | 422.8 | 188 | 79.7 | 98.7 % | 1.8 | 1.1 |
| Easy 300-319 | pool 8 | 22 | 106.4 | 825.8 | 826.9 | 182 | 150.9 | 99.3 % | 3.3 | 1.1 |
| Easy 300-319 | pool 16 | 22 | 106.5 | 1,588.0 | 1,589.1 | 180 | 286.5 | 99.6 % | 6.3 | 1.1 |
| Hard 300-319 | before | 187 | 101.0 | 125.6 | 126.9 | 267 | 33.9 | 36.8 % | 17.2 | 9.3 |
| Hard 300-319 | pool 4 | 166 | 101.2 | 412.5 | 413.8 | 283 | 117.2 | 70.6 % | 27.5 | 8.3 |
| Hard 300-319 | pool 8 | 150 | 101.3 | 789.1 | 790.4 | 288 | 228.0 | 92.0 % | 37.2 | 7.5 |
| Hard 300-319 | pool 16 | 106 | 101.6 | 1,499.9 | 1,501.2 | 296 | 443.9 | 93.9 % | 50.1 | 5.3 |
| Expert 300-319 | before | 562 | 101.3 | 127.5 | 128.8 | 258 | 33.3 | 26.5 % | 70.6 | 29.6 |
| Expert 300-319 | pool 4 | 433 | 101.4 | 414.0 | 415.3 | 277 | 115.1 | 56.1 % | 88.8 | 22.8 |
| Expert 300-319 | pool 8 | 734 | 101.5 | 790.4 | 791.7 | 286 | 226.5 | 68.0 % | 244.4 | 36.7 |
| Expert 300-319 | pool 16 | 435 | 101.6 | 1,500.2 | 1,501.6 | 295 | 443.5 | 83.6 % | 230.9 | 21.8 |

Reading:

- The removals per sample do not move (101 to 107 in every cell): the pool removes as many signs, in another order.
- The ratings per removal are 1.15 before, and 4.0, 7.8 and 14.9 at pools 4, 8 and 16 (Normal 300-319). That is the
  specified algorithm: each step rates the whole pool and removes one sign, and the losers come back in the next pool.
- The time per rating barely moves: +2 % to +14 % on Normal, Hard and Expert, and -6 % to -10 % on Easy. A second
  solve per rating would double it. The small rise fits a pool that steers towards harder intermediate puzzles, whose
  solves cost more; that is a reading, not a measurement.
- So the dig time per sample rises 3.6, 7.0 and 13.8 times (Normal 300-319). At pool 4 the dig's share of the request
  time doubles, from 26.5 % to 53.3 %.
- The rest of the Normal 300-319 increase is ten more attempts (51 against 41) with ten more searches at the proposal
  cap. That part depends on the seeds: on Normal 7000-7039 the attempts fell from 134 to 98, and the total broke even
  (167 s against 164 s).

### 1.3 The questions asked

- **Does a rating solve twice?** No. `classify` reads the report; it does not solve.
- **Is the uniqueness count run per member?** Yes, once per member and before the bounded solve, as S-OD1 words it
  ("after the uniqueness count", `clarifications-resolved.md:653-654`). It is redundant whenever the bounded solve
  succeeds, because a solved report proves uniqueness (`greater-than.js:198`). That is a cost lever outside S-OD1's
  text, not a flaw (IR29).
- **Is refused-stays-refused kept?** Yes, with a fresh mask in every tune round, as specified.
- **Are members re-evaluated unnecessarily?** No. A loser was rated while the winner was still present. Once the
  winner is gone, the loser's removal can become ambiguous or stuck, or score differently, so "each against the same
  current set" needs the new rating. Removed signs are never rated, and refused ones are not rated again in the pass.
- **Is the comparator correct?** Yes: the tier first, then the finite target, then the score. Strict comparisons keep
  the encounter order on a tie.
- **Where does the cost come from?** From the (`SIGN_POOL` - 1) re-ratings per removal that the algorithm prescribes
  (section 1.2).

Why the pool buys so little is a separate question from its cost, and not a code matter either. The guidance does lower
the dug samples per hit on most cohorts (IR24). But most misses end with clues above the floor, which a sign-only dig
never removes (IR23).

## 2. Point 2: are the measurements sound?

Yes.

- **Matched seeds.** Every cohort has the same literal seed list in all four sources. Pool 16's split cohorts are
  merged exactly once per seed (`aggregate-gt.js`; checked: missing 0, duplicate 0).
- **Sources.** The before files record `f7be90f`, clean (`dirty: false`), with `greater-than.js` `24dbbe37…`. Each
  pool's files are dirty only in `greater-than.js` and the new suite, which the driver does not load. The
  after-diagnosis carries the final source: the driver's identity `9eeefec3…` and `greater-than.js` `daecf790…` are
  what I recompute on the current tree. The format-only proof holds: my own hash of the current file is `daecf790…`.
- **Machine, lock and gaps.** One machine (AMD EPYC 7763, 16 cores, Node v26.13.0) and one session, 05:34 to 08:18
  UTC. The 98 commands of `runs.jsonl` all went through `Invoke-Dv3Node`. Lock waits are at most 0.143 s (Pentomino
  paused), every start is at least 15.2 s after the previous end, and the longest command is 392.9 s (a hash
  compound), within 450 s.
- **Unlocked commands.** The listings, the merges with `--check`, the aggregation and plan scripts, the format proof
  and `generator-suites.sh check` and `selftest`. None of them generates a puzzle (IR07's rule).
- **Repeats and control.** The counters of r1 and r2 are identical, and the times agree within 4 %. The driver's
  Normal p95 on the unchanged source (5,261 and 5,280 ms) agrees with the manual CV6 cell (5,209 ms).
- **The Nightmare "before".** There is no before-cell of this session. MS05b3's I5 record (seeds 700-709, slowest
  request 19,192 ms, `docs/difficulty-v3/evidence/MS05b3/outcomes.json:992`) ran on the same engine: `core/js`,
  `generator/js` and `player/js` are identical between `refs/dv3-wip/MS05b3-done-20261114-0705` and `00647f9`, and
  the working tree differs from HEAD only in `greater-than.js`. S-AV16's attribution to the pool therefore holds.
  Before the pool that cell passed with a 4 % margin (19.2 s of 20 s).

Two gaps in the record, neither of which changes a number: the GD cells' applicability to the final tree is true but
not stated (IR25), and the starting tree is labelled `00647f9` where every file records `f7be90f` (IR26).

## 3. Point 3: GG, GR, the pins and E

- **E is on the final tree.** I recomputed the identities read-only with each tool's own rule:
  - the 104 hash ledgers carry `13ec3b86…`, which is `tests/perf.js`'s source hash of the current tree;
  - the wire and analysis ledgers carry `f678cf42…`, which is `tests/replay-fixtures.js`'s;
  - the regression fixture equals the 104 ledgers, 520 of 520;
  - the quick results carry `569c724f…`, which is the Generator quick fingerprint of the current tree, so the final
    quick sets (3,279 of 3,279 and 1,683 of 1,683) apply as they are.
- **The 30 hashes.** Only the `greaterThan/normal` and `greaterThan/hard` arrays of `regression.js` changed, 15 entries
  each. The other 24 combinations are unchanged. That fits: `greater-than.js` is used only by Greater-Than's own dig
  strategy. G11's givens change in value (`givens[4]` 6 to 5), so another attempt's grid won: the pool changes which
  signs go and, through the number of samples before a hit, which attempt succeeds. The ten unchanged Greater-Than
  seeds are not explained (IR27, benign).
- **GR.** G11 (Greater-Than Expert) and G12 (Greater-Than Hard) differ, in the wire and in the analysis. G09 and G10
  (Killer) and G13 (Samurai) match, and so do analyses G01 to G10, G13 and G14.
- **The 12 pins.** Each was re-derived from the refreshed goldens. I read every diff: no assertion changed its form,
  none was dropped, and every branch keeps a specimen.
  - The details sign jumps of G11 go from 4 to 2, and the per-step check stays exhaustive.
  - The details jumps go from 16 to 14, the distinct ones from 18 to 16, and the framed ones from 29 to 27.
  - The reveal fold keeps its G11 specimen (step 5, peak 2,862, four clues restored) and the plain fold its G12 one.
  - The view-dependent jump keeps G11 and G12, and the flat-or-falling hardest technique keeps G13 and G11.

  No test is weakened, which is consistent with section 8.2 of `10-review-of-recovery-steps.md`.
- **CI.** The new shard `greater-than-guided` and the raised bounds (`own-fast` 220 to 300 s, `pipeline` 360 to 400 s)
  keep every job within 1,800 s: projected 630, 1,170, 1,380 and 720 s (`logs/ci-check.txt`; self-test 50 of 50).
  `generator/tests.html` lists the suite.

## 4. Point 4: what blocks a commit under each option

### Option (i): keep pool 4

Nothing technical blocks it: code, E, GR, the pins, the quick sets and CI agree with the tree. Before the commit:

- IR23 and IR24 are corrected in the report, `notes.md` and `generator/design.md`, and IR25's statement is added. None
  of them needs a run.
- F01 is assigned (IR30). Under this option a sentence of the Steps view becomes false for the pooled sign jumps.
- D1 is answered for the pool itself. Keeping the pool also keeps S-AV16 (Nightmare CV6 at 40.4 s), which S-OD1's
  fallback (b) does not cover (IR28).

The commit then carries S-AV01 (Normal 17.0 s), S-AV16 and S-AV17 (Generator quick 726.2 s against 648.0 s) as items.

### Option (ii): set the pool aside

Nothing blocks it if the revert is exact. The orders below are binding for the developer if D1 answers (ii):

1. Restore from HEAD, byte for byte: `greater-than.js`; the fixtures `regression.js`, `replay-wire.js` and
   `replay-goldens.js`; `player.test.js`, `steps.test.js` and `replay.test.js`; `generator/tests.html`;
   `.github/scripts/generator-quick.json`; `generator/design.md`; both developer guides.
2. Delete `generator/tests/suites/greater-than-guided.test.js`. It lies inside the quick fingerprint, so leaving it
   would change the fingerprint.
3. Keep, as the record of a measured and rejected repair: the report (outcome "set aside", with IR23 and IR24 applied),
   `docs/difficulty-v3/evidence/MS05e/`, the scripts in `generator/tests/artifacts/difficulty-v3/MS05e/` (outside
   every fingerprint) and the notes.
4. Prove the identity, with no run. `git diff --quiet HEAD` over `generator/`, `core/`, `player/`, the guides,
   `AGENTS.md` and `.github/` must succeed, with no untracked file left in a fingerprinted folder. Then HEAD's quick
   results (MS05r6c's final runs), its E records and its GD apply by identity.
5. Update the items:
   - S-AV01 returns to 5,209 ms (`gd/before`) and to S-OD1's fallback (b);
   - S-AV16 and S-AV17 are withdrawn, and Nightmare returns to MS05b3's 19,192 ms;
   - S-AV08 returns to MS05r6c's figure.
6. The pack: S-OD1's note that MS06b passes the target into the sign-dig comparator
   (`clarifications-resolved.md:686-689`) loses its object. Astra amends MS06b, or MS06c2 (IR28).

### Option (iii): S-OD1's fallback (b)

This is not an alternative to (i) and (ii). S-OD1 (2), confirmed by the owner, already makes (b) the rule whenever
MS05e does not close CV6 (`clarifications-resolved.md:678-684`, `:691`). It acts on the Normal contract (CV6's
`BUDGET_MS` and GP, before the final timing runs) and says nothing about the pool. MS05e has nothing to implement for
it, and nothing in MS05e blocks it. It has to be combined with (i) or (ii); IR28 gives the facts per combination.

## 5. Findings

| Id | Severity | File:line | Summary |
|---|---|---|---|
| IR23 | Major | `docs/difficulty-v3/cv6-guided-sign-dig-2026-11-14.md:14-15, 41-44, 126-128`; `docs/difficulty-v3/notes.md:759-761`; `generator/tests/artifacts/difficulty-v3/MS05e/aggregate-gt.js:189-190`; task `MS05e-guided-sign-dig.md:158-163` | The diagnosis gate drops the clue-floor condition: the named trap is 22 % of the misses, not 94 %, and step 1's stop/report condition was met |
| IR24 | Minor | `cv6-guided-sign-dig-2026-11-14.md:17-18, 113-115, 120`; `generator/design.md:1050`; `notes.md:762` | "Lowest total time on every cohort" is false for Normal 300-319; "does not raise the hit rate" holds for one cohort only |
| IR25 | Minor | `docs/difficulty-v3/evidence/MS05e/evidence.md:16`; `gd/final/manifest.jsonl` | The GD cells' applicability to the final tree (another fingerprint) is true but not stated |
| IR26 | Info | `evidence.md:6, 12`; `cv6-guided-sign-dig-2026-11-14.md:7` | The starting tree is labelled `00647f9`; every measure file records `f7be90f` |
| IR27 | Info | `cv6-guided-sign-dig-2026-11-14.md:159, 164-165` | Ten Greater-Than seeds keep their hash; not explained |
| IR28 | Minor | `cv6-guided-sign-dig-2026-11-14.md:67, 190-196, 209-211` | D1 presents (b) as an alternative to keeping the pool; the Nightmare consequence and the MS06b note are missing |
| IR29 | Info | `greater-than.js:198, 326-328` | The uniqueness count is redundant for every rating whose bounded solve succeeds; a decision-preserving lever outside S-OD1 |
| IR30 | Minor | `generator/js/engine/replay.js:1197-1198`; `generator/js/ui/step-view.js:421, 1135, 1275` | F01 confirmed: under option (i) a Steps-view sentence becomes false for pooled sign jumps |

#### IR23 — Major: the diagnosis gate drops the clue-floor condition

**What.**

- S-OD1 step 1 (`clarifications-resolved.md:648-650`) and the task's step 1 (lines 158-163) define the trap as a sample
  that ends **below the band at the clue floor** with a minimal sign set. They also make a different dominant cause a
  stop and report, "not permission for another strategy".
- The report counts 355 of the 376 misses (94 %) as that trap, using "below the band with a minimal sign set" alone
  (lines 14-15 and 41-44; `notes.md:759-761`).
- Every sample ends with a minimal sign set by construction. The `signs.minimal` pass runs last in every round, and
  the diagnosis verified 394 of 394 and 504 of 504. So the 94 % is simply the share of misses below the band.
- The driver records the floor (`measure-gt.js:446` and `:472`: `atFloor` means at most one clue above
  `spec.minClues`), but `aggregate-gt.js:189-190` splits the misses by tune reveals instead.

From the recorded JSON (`before/diagnosis.json`, `after/diagnosis.json`; fields `atFloor`, `tuneReveals`,
`initialClues`; no new run):

| Miss | Before | Share of 376 | After, pool 4 | Share of 484 |
|---|---:|---:|---:|---:|
| Below the band, at the floor (at most one clue above it): the named trap | 83 | 22.1 % | 94 | 19.4 % |
| Below the band, no tune reveal, the setup itself two or more clues above the floor | 187 | 49.7 % | 217 | 44.8 % |
| Below the band after a tune reveal (all two or more clues above the floor) | 85 | 22.6 % | 142 | 29.3 % |
| Shallow | 21 | 5.6 % | 31 | 6.4 % |

**Why it matters.**

- By the plan's definition, the named trap is a fifth of the misses. The largest category is a sample whose setup
  already ended two or more clues above the floor. Under the task's rule that called for a stop and report before
  the production edit.
- It also explains much of the null result. The pool chooses among signs, while most misses carry clues above the
  floor that the sign dig never removes.
- What holds those clues is not recorded: the unit minimum, the setup's solvability help with every sign present, or
  uniqueness. The local search, which may move clues, also ran to its proposal cap without an exact hit.
- The plan author needs this split before proposing any further strategy.

This is not a code defect, and every measurement stands.

**Fix (binding for the documents; no run).**

1. Add the table above to the report: section 2, and the after-diagnosis paragraph of section 4.
2. Replace "the trap that the plan author named is real and dominant", "355 (94.4 %) are the trap", "the trap
   dominates; no other category comes near it" and "the trap is not escaped". The new text states the split, and that
   minimality holds for every sample by construction. Correct `notes.md:759-761` the same way.
   `generator/design.md:1050` is literally true; add "(83 of them within one clue of the floor)".
3. Record in the report that step 1's stop/report condition was met and not taken. Carry the split into D1 (IR28).

#### IR24 — Minor: two comparative statements of the report

- "Pool 4 has the lowest total time on every cohort" (line 120) is false for Normal 300-319. There pool 8 totals 88.1
  and 87.7 s, against 89.7 and 93.0 s at pool 4. Pool 4 is lowest on the other four cohorts and in the sum.
- "It does not raise the share of exact samples" and "the per-sample hit rate barely moves (the guidance does not find
  Normal-required puzzles more often)" (lines 17-18 and 113-115; also `design.md:1050` and `notes.md:762`) hold for
  the diagnosed cohort at pool 4 only.
  - Dug samples per exact request, before, then pools 4, 8 and 16 (section 1.2):
    - Normal 7000-7039: 35.9, 23.6, 20.8, 16.9;
    - Hard: 9.3, 8.3, 7.5, 5.3;
    - Expert: 29.6, 22.8, 36.7, 21.8;
    - Normal 300-319: 19.7, 25.2, 17.1, 14.3.
  - The guidance helps a little: up to about twice fewer samples per hit at pool 16. But each sample costs about
    `SIGN_POOL` times the ratings, so no value pays for itself.

**Fix.** Reword both statements with these numbers. The owner reads them in D1.

#### IR25 — Minor: the GD cells' applicability to the final tree is not stated

- The 18 GD cells ran at 07:22-07:37 UTC (`runs.jsonl`) with the manual fingerprint `e6ba01d4…`. The final tree's is
  `1fe84a02…`, which I recomputed with `core/tests/node-evidence.js` and the Generator's inputs.
- The pins of three suites and the documents changed afterwards. The evidence says only "on the final source" (line 16).
- The substance holds; I checked it read-only. **Statement to add** to the evidence (section C or E):

  > GD applicability. The 18 cells ran at 07:22-07:37 with the manual fingerprint `e6ba01d4…`; the final tree's is
  > `1fe84a02…`, because the pins of `player`, `steps` and `replay` and the documents changed afterwards. A
  > `--suite=greater-than` selection neither loads nor reads them. The engine and UI sources are the same before,
  > during and after the cells. The wire and analysis ledgers (07:05-07:09, `f678cf42…`), the 104 hash ledgers
  > (07:10-07:21, `13ec3b86…`) and the after-diagnosis (07:38, `9eeefec3…`) all carry the identities of the final
  > tree. No fixture was written after `hash-update` (07:20:56), and `generator/tests/manual/greater-than.test.js`
  > and `core/tests/harness.js` are unchanged against HEAD.

- If an engine, fixture, manual-suite or harness file changes before the commit, rerun the 18 cells instead.

#### IR26 — Info: the starting tree's label

- The report (line 7) and the evidence (lines 6 and 12) name `00647f9`. Every measure file records `f7be90f`; the
  before files are clean.
- `f7be90f` (pack notes only, no source) was committed at 05:35:55 UTC. That is five seconds before the first counted
  run; the smoke run at 05:34:52 preceded it.
- Fix: one sentence. No number changes.

#### IR27 — Info: ten Greater-Than seeds keep their hash

- Unchanged seeds:
  - `greaterThan/normal`: 8, 55, 89, 233 and 377;
  - `greaterThan/hard`: 1, 3, 144, 233 and 610.
- The report counts them among the "unchanged keys" without a reason.
- One possible reading, not measured: the pool repeats the first-fit removals whenever the first member of each pool
  wins or ties. A sign removal never changes the number of empty cells, so equal technique counts give equal scores,
  and a tie keeps the shuffled order.
- Fix (optional): one sentence, labelled as a reading.

#### IR28 — Minor: D1's options overlap

- D1 (lines 190-196) offers "keep, set aside, or the fallback of S-OD1 (option b)". S-OD1 (2), confirmed by the owner,
  already fixes (b) as the rule when MS05e does not close CV6 (`clarifications-resolved.md:678-684`, `:691`).
- (b) acts on the Normal contract and says nothing about the pool. The open question is whether the pool stays, plus
  which branch of (b) applies.
- Facts per combination, for Astra's D1 draft:
  - **Pool kept, with (b).**
    - The documented Normal contract would have to cover 17.0 s on CV6's seeds. S-OD1 gave "2-5 s would keep the cell
      offered" against the v2 10 s qualification budget for scale.
    - Nightmare CV6 at 40.4 s needs its own answer: S-OD1's (b) names Normal only.
    - The Generator quick time stays 12 % higher, and F01 must be fixed.
  - **Pool set aside, with (b).**
    - Normal is at 5.2 s on CV6's seeds.
    - On seeds 7000-7039 the p95 is 10.6 s with or without the pool (10.7 s at pool 4).
    - Nightmare returns to its 4 % margin.
    - The revert is proved by identity (section 4).
  - **Either way:** IR23's split belongs in the question. The plan author's premise ("at the clue floor ... nothing
    left to remove") describes a fifth of the misses.
- The target hand-off is inconsistent:
  - S-OD1 says MS06b passes the target (`:687`);
  - the report says MS06c2 (line 67) and "MS06b/MS06c2" (line 210).
  - Under (ii) the note has no object. The pack's owner aligns it.

#### IR29 — Info: a decision-preserving cost lever outside S-OD1

- Each rating counts solutions before the bounded solve (`greater-than.js:327-328`). A solved report already proves
  uniqueness (`:198`; `difficulty.js`, `provesUniqueness`).
- Solving first, and counting only when the solve gets stuck (to name the reason `ambiguous` or `techniques`), would
  keep every decision, log entry and reason. Only the budget's consumption would change.
- About 96 % of the pool's ratings are allowed, but the count's share of a rating is not measured. The same lever
  applies to the unguided pass, so it does not change the verdict.
- It is outside S-OD1's text ("after the uniqueness count"). This is for the plan author, should the pool be kept or
  redesigned; it is not work for this task.

#### IR30 — Minor: F01 confirmed

- For a sign move, `choiceOf` returns `checked` (`replay.js:1197-1198`). The Steps view then says "The log contains no
  comparable-candidate scores for this change" (`step-view.js:421`, `:1135`, `:1275`).
- Under option (i) that is false for every pooled sign jump: G11's two details sign jumps carry rated spans
  (`replay.test.js`, the new MS05e-T02 cases).
- It is outside MS05e's file scope, as the developer says. It does not block the step commit, but must be assigned
  before a release-facing step. Under option (ii) it is moot.
- Related, older and Info only: the `dig.keep` text "which makes the puzzle hardest" (`locale.en.js:491`,
  `locale.vi.js:474`) is already false for the losers of the cells dig, and the pool extends it to signs.

MS05e REVIEWED: 0 blocking, 1 major (IR23), 4 minor (IR24, IR25, IR28, IR30), 3 info (IR26, IR27, IR29).
Verdict: slowdown inherent to the pool.

## 6. Cross-check of the CV6-05 pack edits (SA2's request, 2026-11-14)

**Basis.**

- Checked against Fable's complete answer (`clarifications-resolved.md:1819-1950`, question from `:1575`) and the
  register rows S-OD1 and S-OD6 (`:1961`, `:1971`). Owner decision via S-OD6: Q1(b), withdraw the pool; Q2(a), keep
  the contracts and let final qualification decide the offer.
- Read-only: SA2's 14 working-tree files, plus the current `digger.js`, `pipeline.js`, `rng.js`, `perf-helper.js`,
  `generator/tests/manual/greater-than.test.js` and `generator/design.md`.
- No Git action, no test, no generation. The orchestrator's restoration and identity proof were not repeated. The
  developer's three documents are in progress and were not reviewed here.

| Point | Result |
|---|---|
| 1. Target transported, not consumed | **Pass.** The first-allowed sign pass receives `options.target` and ignores it; MS06c1's keeper view carries it; only local acceptance (`preferRated`) and the `attemptBest` continuation act on it, with no inequality refinement. No edit to `greater-than.js`, and no pool, constant or comparator (MS06b:113-115, 162-165; MS06c1:15-16, 26-30, 136, 153, 165-167; MS06c2:14-17, 56-82, 225, 245-254; check-list 158-161, 199, 509, 518). MS06b's helpers and its three-way number/null/absence forwarding are unchanged, and MS06c1 keeps its no-finite-target rule and its `signs` spy |
| 2. MS06c2, MS06d and MS06a | **Pass.** B01 is Fable's sentence. T01 lives in `digger-target`, delegates to the real registered `signs` strategy, and requires that the selected result's target equals its originating invocation's, not mere presence. The deleted suite is gone from MS06c2's file list and command. MS06d:40-45 accepts a small or null Greater-Than effect as valid. All 17 cells and 204 requests are kept (MS06a:35-43, MS06d:18, 44). MS06a's prerequisite is the closed, set-aside MS05e with identity proved, plus the corrections and this cross-check (MS06a:5) |
| 3. S-AV01 and the three endings | **Pass, with CC01.** The 5,209 / 1,400 ms and 10.6 s figures, the 700 ms base, unchanged GP rules and no interim removal, skip or wrapper appear consistently (check-list 282, 293-301; MS07e:68-74; MS18c:72-97, 192-203; MS18d:43-53; MS18e:78-87, 237-238). MS18c's conditional check reuses a compatible record or runs the one unchanged selector, not full GD, before MS18d. No value is authorized |
| 4. Withdrawn items, Nightmare margin, MS17b | **Pass.** S-AV16 and S-AV17 are withdrawn as current-source items and kept as history; S-AV08 is 648.0 s. The 19,192 of 20,000 ms margin note sits in the check-list (303-307) and MS07e (75-79), with later moves attributed to the task that causes them. IR29, IR30, F01 and F02 are moot (MS05e:9). MS17b:57-59 freezes no sign-pool choice |
| 5. Diagnosis gates and scope | **Pass.** Check-list 232-235: an exact-predicate table with every condition, then a wait for the orchestrator before the first production edit, even when the gate supports proceeding. No new scope; `improve-generating` stays unauthorized |
| 6. No operative pool or suite assumption | **Pass.** Searches for the pool, the deleted suite and a sign comparator find instructions only in MS05e's original brief, below its closing note (MS05e:3-13: "historical, not permission to reinstate"). Every other current mention is a prohibition or a withdrawal |

On point 6, the line between preserved history and active briefs:

- **Historical:** completed task bodies and logs still name MS05e as the CV6 owner and say that MS06a waits for its
  repair (MS05b1:229, MS05b2:16 and 208, MS05b3:16, 266, 325 and 334, MS05d:102-103 and 206, MS05r6:293 and 305-306,
  MS05r6b:349 and 486-487, MS05r6c:151 and 167). They are historical and correctly not rewritten; the check-list
  (19-21, 145-153) and MS06a's header supersede them.
- **Active:** MS06a to MS06d, MS07e, MS17b, MS18c to MS18e and the check-list. They carry no pool or sign-comparator
  assumption.

**The code supports what the pack says.** Read-only checks:

- `refineDown` returns at once for a model with inequalities (`digger.js:1252`). On Greater-Than the target can
  therefore act only in local acceptance and in the `attemptBest` continuation.
- `digLevelSteps` hands its own `rng` and resolved options to the strategy (`digger.js:1364`). `pipeline.js:177`
  resolves the registered strategy once per request, so a get/unregister/register wrapper sees every sample
  invocation.
- `fork` depends only on the seed and tag (`rng.js`). So `targetFor(spec, SG.rng.create(rng.seed))` reproduces the
  sample's draw, and T01's check can be implemented as written.

#### CC01 — Minor: the conditional Normal contract step omits `generator/design.md` §9.1

**What.** Fable fixes the form of a decided Normal contract: one base in CV6's `BUDGET_MS.normal`, the same base for
the GP target, the factor through `SG.test.timeLimit`, and the test and both developer guides changed in the same
step. The pack's file list for that step is: the test, `perf-helper.js` "if present", and both guides
(MS18c:86-90, 139-142; check-list 300; MS18d:48; MS18e:85-86).

**Why it matters.** Both numbers are documented as copies of `generator/design.md` §9.1:

- The test's `BUDGET_MS` is commented "design.md 9.1, greaterThan row" and its name says "within the design.md 9.1
  budget" (`greater-than.test.js:17-18`, `:1037`).
- `PERF_TARGETS` is "the p95 budgets of design.md section 9.1" (`perf-helper.js:6`, `:63`; the Greater-Than Normal
  GP target is present, at 700 ms).
- §9.1's table still says `< 700 ms` (`generator/design.md:1145`).

The step as listed would leave the living design stating the old budget. MS18d's own target rule already pairs
`PERF_TARGETS` with "corresponding Generator design 9.1 and both developer guides" (MS18d:128-129).

**Smallest correction (wording only).** In those four places, name `generator/design.md` §9.1 (the `greaterThan`
Normal cell) beside the test, the GP target and both developer guides, in the same assigned step. This completes
Fable's form under the check-list's living-design rule; it changes no decision, value or order. It does not block
MS06a.

#### CC02 — Info, optional: the cost of T01's real request

- MS06c2's route proof runs one fixed-seed Greater-Than Expert pipeline request inside the quick suite
  `digger-target` (MS06c2:245-254).
- On the restored source, Expert seeds 300-319 took p50 1.9 s, p95 11.7 s and at most 14.6 s
  (`evidence/MS05e/before/expert-300-r1.json`).
- Picking a seed with a short request, and recording its time for `digger-target`'s CI shard (owned by MS06b), keeps
  S-AV08 honest.
- No pack edit is required.

**Cross-check verdict: PASS, with one Minor wording correction (CC01); CC02 is optional.** CC01 applied as written
needs no re-review.
