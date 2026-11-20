# 14 — Implementation review of MS06c2 (one originating target in every search stage)

Reviewer: SA1 (claude-opus-5.5), 2026-11-14. Review set: S-OD4 analyst reviews (MS06b to MS06c2).

Scope: HEAD `9563c63` (MS06c1) plus the uncommitted MS06c2 diff and its untracked evidence and artifacts. Not part of
this step and not reviewed: the orchestrator's time fix in MS06c1's log and check-list row, Astra's MS06c2 task-file
edits and section 7 of my review 13.

Against: `tasks/difficulty-v3/MS06c2-activate-target-policy.md` (B01-B02, T01-T04 and the IR39(b) rules), R3, R6, R7
and R23, FS12-FS16 and FS20, CV6-05 (no `greater-than.js` edit; the sign pass transports the target and does not
consume it), the no-clue-additions rule on models with inequalities, and IR34 and IR38-IR44.

Method: read-only. I read the engine diff line by line, every added or migrated test, the documentation and locale
diffs and the evidence. I recomputed the identities and compared the fixtures with HEAD and with the ledgers in memory,
with the repository's own hashing rules. I ran no test, generation or timing, and changed nothing except this file.

## 1. Verdict

**Accept with a short fix round.** The activation is correct and complete. It follows the brief and IR39(b) exactly.
Requiredness wins over proximity at every stage, and the first-exact stop, every cap and the sign rules are kept. E is
complete and was recorded from the final sources, and both quick sets are green on the current tree. There is no
correctness, evidence-corruption or recorded-decision finding, and no Major.

Findings: 5 Minor (IR45-IR49) and 2 Info (IR50, the rulings on the five deviations; IR51, coverage and handoff notes).

The fix round:

- IR45, IR46 and IR47 are text in `docs/difficulty-v3/notes.md`, the evidence and the provenance note of the CI
  manifest. They are outside both fingerprints: no rerun.
- IR48 (two test specimens) and IR49 (locale wording) change fingerprinted files, so the final Generator quick set must
  be run again. If the orchestrator prefers not to rerun now, both can be carried as named follow-ups to the next owner
  of those files. Neither touches generation or E.

## 2. What holds

### 2.1 The route (IR39(b), R7, IR38, IR42)

- The sample loop (`generateAttempts`, `digger.js:2122-2131`) draws after its early-stop and cap guards:
  `sampleRng = rng.fork('dig#A.T')`, then `targetFor(spec, sampleRng)`. The last object of
  `Object.assign({}, digOptions, {..., target})` overrides the copied caller value, and neither options object is
  changed (IR38). An open band gives `null` with no draw.
- `digLevelSteps` (`:1436-1437`, `:1454`) honours an own `target` property as given. The strategy gets the raw own
  value, as MS06b and MS06c1 forwarded it, and the stages normalise it. An absent property is initialized once from the
  entry's own stream, before `keeperView`. `digStageSteps` (`:953`) forwards `nullableTarget(options.target)` and never
  initializes.
- The continuation (`:2152-2157`) passes `target: attemptBest.target`, `null` included, with the original keeper from
  `digOptions`. Nothing forks `search#A/target`. The structure hook's context still has the original keeper and no
  target, so a structure winner keeps `null`.
- Every view is made from the original keeper, once per context. Refinement and the local search use their context's
  view and never wrap it again (IR42).

### 2.2 The three stages

- **Guided pass** (`digGuidedSteps`).
  - Initialization: a score-targeted pass rates its own board once (`:810`). It uses the same bounded evaluator, with
    `assumeUniqueness: false`, `OBJECTIVE_STEPS` and the inherited budget, and an empty group, so no DFS runs. It
    counts one `oracleCalls`, and a refused or guarded result ends the pass on the board it got. Real errors propagate.
  - Pools: each pool is seeded with its first success (IR33) and compared with `preferObjective` (`:847-848`).
  - Applying the winner: `applyBounded` false breaks to the one `trace.pass('guided', 'end', clues)` (`:858`), with no
    further pool, rating or shuffle. The pool's order makes that safe. The winner is the tier-using member nearest the
    target, if any member uses the tier. So when "true to false" is refused, no member uses the tier; when "true to
    true, finite" is refused, no member is strictly nearer. Proposals keep their priority, and every `trace.keep` stays
    numeric (`shownValue`).
- **Refinement** (`refineDown`). It is still never entered for a model with signs (`:1336`). Above the band the old
  "solved and at least `min`" rule holds through `acceptReveal`. From an exact in-band state it goes on only while the
  finite target is below the state's score (`:1350`), and keeps only exact, in-band reveals strictly nearer the target
  (`:1368`). Exactness is model-aware (`isExact`). The 64-rating and cap check (`:1351`) is unchanged and comes before
  every reveal, and every solved reveal is offered first (`:1362`).
- **Local search.**
  - The predicate is the brief's, written out (`:1772`): `next.solved === true && next.score < spec.max &&
    preferRated(...)`. It compares the `qualityOf` of the candidate's own model with the state's (`:1647`), and the
    state's quality moves with it.
  - The keeper offer still precedes it (`:1766`), and the MS05b1 loop condition (`:1690`) is unchanged.
  - Additions remain off for models with inequalities (`:1680`).
- The `tune` verdict carries a finite target, zero included, and omits `null` (`:1527`). The result copies the
  origin's scalar (`:2225`).

### 2.3 Requiredness, stopping, caps and Greater-Than

- **Requiredness wins over proximity.** In the pool, the tier comes before the distance, and true to false is never
  applied. In refinement, a tier-losing reveal is undone. In the local search, quality comes first (0 exact, 0.5
  shallow), so an exact neighbour with a lower score is followed. The keeper and the final choice use quality only.
  No target is compared across samples.
- **First-exact stopping.** The outer stop is unchanged: `if (puzzle.exact) break`, the keeper-exact break, and the
  search only when neither the best result nor the keeper is exact. An entered refinement may continue past its first
  exact state, which the brief explicitly allows; the keeper keeps the first exact state and the sample returns the
  nearer one. Every cap (`REFINE_RATINGS`, ratings, proposals, the shallow allowance) is unchanged.
- **Greater-Than.**
  - `greater-than.js` is unchanged, and it has no `target` reference and no cells dig.
  - The registered `signs` strategy receives the option and ignores it: four probes (null, 0, 1e9 and 1) give the same
    puzzle.
  - Refinement is not entered for signs, and no clue is added.
- **Nothing else changed in the engine.** `pipeline.js` and `explain-data.js` change comments only; the locales do not
  touch generation. No weight, band, cap, floor or offer changed.

### 2.4 Tests that would catch plausible wrong implementations

- **The caller's `options.target` kept, or put first in `Object.assign`:** the three IR39 tests, with caller inputs
  812.5, 0, `null`, absent and `NaN`; a finite caller value must differ from the draw.
- **A draw from the parent, from `search#A` or from the last sample:** the fork-path test (`dig#1.t/target` only, one
  per sample), and the local-search case (the middle sample, no `search#1/` fork).
- **The old highest-score rule, or the next pool drawn after a refused winner:** 29 real passes replayed against an
  independent table, and the scripted pools (calls = 1 + tries, one shuffle, one end record).
- **Initialization missing or counted twice:** `oracleCalls` = stage A + 1 + candidates, in the replay and in the
  scripted pools.
- **Refinement stopping at the band edge, overshooting the target or keeping a shallow state:** the refineDown vectors
  1100 → 920 → 880, 950 to 850, 800, the shallow 920, the open target and an in-band entry.
- **The old non-decreasing local rule, or no band ceiling:** the pipeline cases. A lower exact neighbour is followed; a
  nearer one is followed and an equal one is not; an above-band one is not.
- **Sign consumption, or a target lost on the way (IR34):** T01, with strict equality per invocation, exactly one
  origin target equal to the result's, and probes at four targets.

The migrations keep their coverage, as the brief required:

- worker and cache: finiteness and strict round trips; an old wire compared with an expected result whose target
  alone is `null`; `expectSameResult` unchanged.
- difficulty-diagnostics: the producer's own targets on both routes.
- pipeline: the explicit-verdict vectors moved to the lower-level entry, absence there now draws.
- The REAL premise and MS05b1-T02 keep their assertions.

The exception is IR48.

### 2.5 E, pins and identities (recomputed)

- **Quick sets.**
  - Generator `9bcc6343...` (160 files) and Player `e764236e...` (130 files) match the results files, so the final
    quick runs are on the current tree.
  - Generator 3,346 of 3,346 (1,465 + 1,658 + 154 + 69) and Player 1,683 of 1,683, all complete and source-stable.
  - T01: 246.9 ms. `digger-target`: 75 tests in 1.42 s (1.22 s in its group), against the 30 s bound.
  - The CI check passes with the projections unchanged.
- **Ledger identities.** The GG ledgers' `2cbaaf30...` and the GR ledgers' `e6cba0fc...` both recompute from the
  current engine and recorder files. The final identity check after the last edit holds.
- **GG.** `regression.js` equals the 104 ledgers: 520 unique records, no overrides. Against HEAD, 194 of 520 hashes
  changed in 20 of 26 keys, and every per-key count equals the evidence table. The changed seeds include only seed 5
  for classic9/easy, so the guides' "Classic 9x9 easy, seed 3" example is unchanged, and a test still pins it.
- **The 194 changes are explained by the mechanism and nothing else.** The source diff has no other behavioural
  change.
  - The six unchanged keys fit the mechanism. For the Very Easy keys, the classic9 floor of 40 is above the 38 clues
    of `GUIDED_START`, so stage A hands over at the floor (likewise for classic4, classic6 and sohei) and every guided
    pool is empty. Greater-Than is the other case; for the wording, see IR46 (c).
  - The per-puzzle attribution would need the old source, and T04 does not ask for it.
- **Wires.**
  - Against HEAD, the changed fields are G09 10, G10 16, G11 1, G12 1 and G13 5. Besides `target`, only `work`
    counters change.
  - Each target is the draw of exactly one sample path: G09 `dig#5.4`, G10 `dig#1.1`, G11 `dig#5.2`, G12 `dig#3.2` and
    G13 `dig#1.1`.
  - G10 and G13 share seed 42, the Nightmare band and `dig#1.1`. That explains their identical 1960.0198..., which
    looked suspicious.
  - G11 and G12 match their exact attempts, 5 and 3.
- **Analyses.** G01, G04, G05 and G06 differ from HEAD; the other ten are equal (see IR46 (a) for G06).
- **Pins and document numbers.** For G01, these agree with the refreshed golden and with the tests, and design.md
  §7.5 and both developer guides carry them:
  - the compact scores 0, 23, 44, 47, 235, 969, 969;
  - 28 positions and 29 details steps;
  - cuts at 7, 22, 25, 26 and 27, with ratio 2.143;
  - the jump 47 → 235 (×5.0), in which R6C1's share is ln(234/47) / ln(235/47) = 0.9974.

### 2.6 Documentation (IR41, IR43, IR44)

- design.md §6.8, 7.2, 13.9, 13.13 (the five seams), 15.2 and 15.3 (I4) describe the active behaviour correctly.
- The `GeneratedPuzzle.target`, `LevelPuzzle`, `digLevel`, `registerStrategy` and `pipeline.js` comments drop the
  whole "comes back as given" promise (IR44).
- Both developer guides agree with each other.
- A grep of the code, design, guides, README and AGENTS finds no remaining "not wired", "nothing draws", "no normal
  caller", "preparation phase" or "hardest removal" claim.

The exceptions are IR45 (notes), IR49 (locales) and IR51 (one pre-existing design row).

## 3. Findings

### IR45 — Minor — notes and evidence describe the refinement backwards

- **Where:**
  - `docs/difficulty-v3/notes.md:867`: "the downward refinement (stops at the first exact state above the target; same
    64-rating allowance)".
  - The evidence says the same at `evidence.md:32` ("`refineDown` stops once the state is exact above the target") and
    `:66-67` ("the refinement stops at the first exact state above the target").
- **Problem:** this is the opposite of the rule that is specified and implemented. From an exact in-band state, an
  entered refinement goes on while the state's score is above the finite target, and keeps only exact, in-band reveals
  strictly nearer it (`digger.js:1350`, `:1368`; 1100 → 920 → 880 in the tests). design.md §6.8 (2) is correct.
- **Fix:** replace the three sentences. For notes.md: "the downward refinement (from an exact state in the band it
  goes on while above the target, keeping only exact reveals strictly nearer it; same 64-rating allowance)".

### IR46 — Minor — evidence inaccuracies in the E explanation and the index

None of these changes the validity of E or of the quick sets.

- **(a) G06 is a new puzzle too.** Its last guided removal changed: the final score went from 2,348 to 2,336, with the
  same 55 empty cells. A deterministic rating of one board cannot change, so the board did. `evidence.md:92` and
  `notes.md:877` name only G01, G04 and G05. Add G06 as a puzzle that differs in its last guided move.
- **(b) Two ledger identities, not one.** `evidence.md:9-10` says "every ledger carries `2cbaaf30...` (SHA-256 over
  the 63 engine sources of `tests/perf.js`)". In fact:
  - only the 104 GG ledgers carry `2cbaaf30...`, a hash over the 45 engine files of `SOURCE_FILES` plus
    `perf-helper.js`, `tool-records.js` and `perf.js`;
  - the 19 GR ledgers carry `e6cba0fc...`, a hash over all 63 `SOURCE_FILES` plus the four recorder files.

  I recomputed both, and both match the tree.
- **(c) Greater-Than Normal and Hard.** The reason given for these keys staying unchanged, "every sample is exact"
  (`evidence.md:62`), is contradicted by the GT goldens. G11 has four attempts, and G12 two, whose twelve samples all
  missed; each was followed by a search of 32,768 proposals and 0 to 2 ratings. The supported mechanism: the sign pass
  ignores the target, and a GT local search rates almost nothing, so no new rule decides.
- **(d) Killer Easy** (`evidence.md:69`, "its cage search wraps the same cells dig"). The wrapper is the dig strategy
  `digKiller` (`killer.js:1009-1019`). It runs `digStage` with `guided: true` and floor 0, so its guided pass, stopped
  by the band, decides every seed. The layout search only rates layouts.
- **(e) 17 transcripts are empty (0 bytes):**
  - `quick/*.txt`, including `digger-target-t01.txt`;
  - `quick/preliminary/*.txt`;
  - `pins/*.txt`.

  The complete results JSON carry the quick numbers, which I verified. But the index's claim "the probes of the facts
  are in `pins/`" (`evidence.md:107-108`) has nothing behind it. Either record the probe outputs (no timing is needed),
  or cite the JSON and the scripts and drop the claim. Also say what failed in
  `quick/preliminary/quick-replay-player-first-run-failed.txt`.
- **(f) The CI manifest's pipeline figure.** `measuredSeconds` 332.24 comes from the preliminary run (source
  `0bd843b3...`), not from the final run (326.80 s). Either value is information only, but the provenance note says
  otherwise.

### IR47 — Minor — S-AV08's rise can be attributed, and the item says it cannot

**Where:** `evidence.md:136-137` and `notes.md:886-887`. They say the activation's share of the +41.9 s "is not
isolated (MS06c1's per-test times were not recorded)".

**Problem:** the times were recorded. `docs/difficulty-v3/evidence/MS06c1/quick/generator-*.json` hold per-test
milliseconds, on the same machine (EPYC 7763, 16 cores) and with the same time factor 2. Test by test:

- **`pipeline` (148 tests in both runs): +40.2 s, all of it in four tests that generate puzzles.**
  - The three instrumentation-cost tests generate classic9 Easy seeds 1 to 24 and Normal seeds 1 and 2, again and
    again. They went from 75.0, 75.6 and 75.7 s to 88.4, 88.4 and 88.0 s, which is +16 % to +18 %.
  - "classic9, every level, several seeds" went from 18.2 to 22.0 s (+21 %).
  - The other 144 tests together moved by -2.2 s.
- **Other suites:**
  - `mega` +4.7 s (11.0 to 15.7 s): mega16 hell1 1.35 to 3.82 s, mega12 nightmare 4.93 to 5.97 s.
  - `multigrid` +2.8 s (samurai normal 1.95 to 3.51 s), and `difficulty-floor` +1.7 s.
  - `steps` +2.5 s and `replay` +2.4 s (pins for more jumps).
  - `player` -7.4 s (the real top-level replay test, 121.6 to 115.0 s).
- **E, on the same machine:** GG 567.0 to 522.0 s, wires 76.0 to 71.3 s, analyses 90.0 to 86.7 s.

So the rise is the generation cost of the active policy on those fixed requests. The effect is mixed across workloads:
slower for the quick Easy/Normal batches and for mega, faster over the 520 GG requests.

**Fix:** correct the S-AV08 item and the notes sentence with these numbers, and route them to MS06d (which measures
the 204 requests) and MS07e. This is not a stop under S-OD4: 326.8 s keeps a 9 % margin to the unchanged 360 s
projection.

### IR48 — Minor — two restored-culprit tests became vacuous on their main point

**Where:**

- `generator/tests/suites/steps.test.js:1520`, "a restored culprit gets the restore legend ...";
- `generator/tests/suites/player.test.js:1009`, "a restored culprit is framed as causeRestore and leaves the revealed
  clues ...".

**Problem:** both now take `base.marks.dug[0]`, a clue the move *removed*, as a made-up restored culprit.

- The checks that the culprit leaves `marks.revealed`, and the board's `cell--revealed` frame, are now trivially true:
  the cell was never revealed.
- The player test now pins a contradictory state: `step.marks.dug` (the base cause plus the base dug cells) contains
  the same cell as `step.marks.causeRestore`.

Before, the specimen was a clue that the jump really showed again, and the test proved that it moved from `revealed`
to `causeRestore` while `dug` stayed the same.

**Fix:** use a specimen whose move really restores a clue. Options are a synthetic log with a search reveal (as
`replay.test.js` now does for the four-part probe order), or G07's exchange step with a synthetic jump transition.
Then restore the original assertions:

- `revealed` loses exactly the culprit;
- `dug` is unchanged;
- no cell is in both `dug` and `causeRestore`.

### IR49 — Minor — the dig explanation says "needs" where the pass reads `tierUsed`

**Where:** `explain.dig.how`, at `locale.en.js:238-244` and `locale.vi.js:233-239`. The pass is described as taking
"one that needs a technique of the level", and "Once the puzzle needs such a technique ..." (VI: "cần một kỹ thuật").

**Problem:** the pass ranks by the oracle's `tierUsed`: its restricted solve *used* a technique of the tier. The code
and design.md §6.8 state that this is "not the requiredness of the puzzle", and v3 keeps "needs" for `requiredOf` (for
example `tune.shallow`: "does not need a ... technique").

**Fix:** use "uses", or "whose solution uses" (VI: "dùng"), in both languages. Optional, in the same edit:

- Wrap the five new locale lines of 111 to 113 characters to the 110-character convention (DEVELOPERGUIDE,
  "Conventions").
- `help.difficulty.guarantee.nightmare` (`help.js:1160`, `:1430`) still says the refinement shows clues "until the
  score falls into the band". That no longer describes an exact state above the target that goes on towards it.

### IR50 — Info — rulings on the five deviations

See section 4.

### IR51 — Info — coverage and handoff notes

- **The 64-rating cap.** No quick test binds `REFINE_RATINGS`: with the default symmetry a 9x9 board has at most 41
  groups. The cap line (`digger.js:1351`) is unchanged and comes before every reveal, so the continuation shares the
  one allowance. To pin T03's "64-rating cap" literally, add a scripted case with more than 64 empty groups (for
  example `symmetry: 'none'` on 9x9, or a larger board).
- **The four-part probe order** (`replay.test.js:1424`) now runs on a synthetic 4x4 exchange. It no longer pins the
  total of 16 solver calls, only the first 14 in order.
- **A stale design row.** `generator/design.md:2065` still says stage B runs on "levels from `normal` up", but
  `GUIDED_FROM_LEVEL` is 0, so it runs at every level. The wording predates this step, but this step edited the row.
- **The manual suites** now run under the active policy; one example is the `difficulty.test.js` case "works on the
  smaller boards", which needs at least 18 of 20 exact. They were not run here. MS18e's `--all` is the first run of
  them, and MS06d's 204 requests are the measurement.
- **Plateau effects for MS06d to watch.**
  - In G10, the search of the fourth attempt (`work[3]`) now ends on the proposal cap: 2,124 to 32,768 proposals, and
    256 to 105 ratings. The eighth (`work[7]`) goes the other way.
  - The Greater-Than searches rate 0 to 2 candidates in 32,768 proposals, as they already did before this step.

## 4. Rulings on the deviations

1. **`localSearchSteps` with an initially exact 920: accept.**
   - The case cannot occur in production. A search starts only when neither the best result so far nor the keeper is
     exact (`digger.js:2146-2147`), and `attemptBest` is chosen with the same model-aware `qualityOf`.
   - The guard is the unchanged MS05b1 loop condition (`:1690`). An exact entry is below the band maximum, so
     `refineDown` is not entered either.
   - The brief allowed no new seam ("no duplicate exports or replacement API"), so leaving `searchStrategy` unexported
     was right.
   - Record it as a deviation in the log.
2. **The dropped hell2 local-search tie: accept.**
   - In production a `null` target exists only on the open hell2 band, because every finite-band sample now draws.
   - On that band an in-band complete rating is exact (the tier is empty) and ends the search. Below the band, equal
     quality means an equal score. So "the higher score at equal quality" can never decide there.
   - The MS06b helper vectors cover the `null` tie.
3. **The REAL premise moved from seed 1 to seed 5: accept.** The seed is premise data. The assertions are unchanged,
   and the test proves the premise itself (`firstShallowAt > 0`, `shallowRatings > 64`).
4. **Other specimens: accept, except the restored culprit (IR48).** The exchanges now come from G07, and the four-part
   probe order, the four-part sentence and the wrapped-singles layout use synthetic specimens. The small loss of the
   total solver-call count is noted in IR51.
5. **Plateau moves are no longer followed: specified, not an unauthorized behaviour change.**
   - FS14 wrote the predicate as `next.solved && next.score < spec.max && preferRated(...)`, and the brief says "exact
     ties false" (MS06c2 lines 246-247).
   - MS06b defined and tested `preferRated` as strict ("equal is false").
   - R7 ranks local moves by quality, then by target distance: a strict hill climb, like R6's "strictly improves" rule
     for the pool.
   - The old non-decreasing-score rule followed equal scores; the new one cannot, by design. The developer's "a
     deliberate consequence" should read "specified by FS14 and MS06b".
   - Its effects (IR51) are for MS06d to measure. There is no owner question.

The evidence's fourth deviation, that E could not be announced, is for the orchestrator to acknowledge. E ran under the
sudoku lock, and Pentomino is paused (P-OD11).

## 5. Handoff

- MS06d receives the no-override final source and IR47's numbers (S-AV08, mixed generation cost), plus IR51's
  plateau and manual-suite notes.
- The inherited S-OD4 list is otherwise unchanged.
- The current identities are:
  - Generator quick `9bcc6343...`;
  - Player quick `e764236e...`;
  - GG ledgers `2cbaaf30...`;
  - GR ledgers `e6cba0fc...`.

  After the IR48 and IR49 fixes, the Generator fingerprint changes, and the final quick runs must be repeated.

MS06c2 REVIEW DONE
