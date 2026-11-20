# Rating v3: SA1's check of the joint report draft (Sudoku)

Status: check, 2026-11-12, of `docs/difficulty-v3/report-detailed.md` (SA2's draft: 1,233 lines, R1-R24,
MS01-MS18), at HEAD `6abcb9f` (branch `rating-v3`). Read-only: no repository file was changed except this one. No
suite or gate ran. Read-only probes from `generator/` listed the technique registry with the proposed registrations,
the variants with their offered levels, and the 69 line ranges the draft cites. "draft:n" is line n of the draft;
SA1-3 and SA2-3 are the two `3-response-to-review.md` files; "the status table" is the one at the top of
`docs/difficulty-v3/clarifications.md` (as of 08:52).

---

## 0. Summary

**Sign-off: signed subject to the listed changes.** 11 required changes (C1-C11, §3), 6 non-blocking notes (N1-N6,
§4), no objection to any FINAL technical contract.

- Every agreed position of both responses is in the draft (§1). The technical content is right: with S2.1's three
  moves and the fourteen new registrations, the 40 IDs have non-decreasing weights in ladder order, equal weights keep
  their HEAD order, and R1's tier table follows from the bands (§2.1). The S3 proof contracts are sound, and the 69
  cited line ranges are at the cited lines.
- Two corrections in the draft change the breakdown I signed in SA1-3 §5, and I accept both: `forcingChainLong` takes
  order 198 in MS07, not MS16 (E19), and the first qualification checkpoint (MS07) changes no support list (E20).
- The required changes make contracts and branches executable: the order of the `requiredOf` cases (C1); three
  exactness consumers and the tests that change on purpose (C2); how the cap, window and target measurements are run
  (C3); what MS18 does when a final recheck disagrees (C4); R7-C's inconclusive case (C5); a selectable R20-B (C6);
  the quick cage suite, which does not exist (C7); the history store's version (C8); the qualification job count and
  checkpoint scope (C9); the GS-before cells (C10); AUTH-S2's status (C11).

---

## 1. Agreed positions: are they reflected?

| # | Item | Agreed position (source) | Draft | Check |
|---|---|---|---|---|
| 1 | Derived `required` boundary | complete canonical `rate()` results after S2.1; `certifyFloor` as reference; the uniqueness proof stays; the oracle's `tierUsed` is a proxy (SA1-3 §3, SA2-3 §1.1-§1.3; status table: agreed, for the plan author) | R2 branch A with preconditions 1-4; PENDING SA1-Q-S7 | reflected; C1 orders the null and vacuous cases |
| 2 | S2.1 before S1 | baseline and tooling, S2.1, S1, S2.2, S3, version and final evidence (PROC-S1 (a)) | R24 "FINAL ordering"; §5.2 order | reflected |
| 3 | Qualification checkpoints | first after S2.2, final after S3; no pruning from intermediate runs (status table: qualification timing, SA1-Q-S5) | R24; MS07 and MS18 rows; gate ledger | reflected; C9 (job count, checkpoint scope) |
| 4 | Window measurement and selection rule | measure <= 4 and <= 6 on fresh puzzles; the higher exact Nightmare count wins, <= 6 on a tie; the owner approves the rule (SA1-3 §4 row 1; status table) | R9 branch C | reflected; C3 (how the two cutoffs run), C4 (the S3 recheck) |
| 5 | Target scope | disputed, for the owner: SA1 guided dig first, extend if Expert's median position > 0.75; SA2 one target through refinement and local search | R7 branches A, B, C, D | reflected; C3, C4, C5 |
| 6 | Shallow-search cap | (c) a measured cap, (a) until chosen; 128 withdrawn (SA2-Q-S12) | R5 branches A, B, C | reflected; C3, C4 |
| 7 | History version | new entries store `ratingVersion`; entries without it read "made by an earlier version" (SA1-Q-S6 / SA2-Q-S07, agreed) | R22 | reflected; C8 (the store's own version) |
| 8 | VeryEasy | the three singles as tier, a vacuous certificate, `floorLevel: null` (SA2-Q-S01 (a)) | R1 | reflected |
| 9 | Warnings and events | both warnings, `tune.shallow`, a localised `{level}` (SA1-Q-S3 / SA2-Q-S06 (a)) | R4 | reflected; C2 adds the missing consumers |
| 10 | Tooling before orders | AUTH-S2 (a); the status table and part C now record it as agreed | §5.2 order MS04 -> MS03 | reflected; C11 (R21 and §9 still describe a dispute) |
| 11 | `forcingChainLong` at 198 before ALS-XZ | plan:481-482; part D item 6 | R9 "final order 198 from MS07" | reflected (my MS16 row was wrong: E19) |
| 12 | 135 variant/level rows | the final qualification covers every variant and level | R24 | reflected; verified: 15 registered variants x 9 levels, and `generator/tests/manual/difficulty.test.js:314` asserts `rows === ids.length * LEVELS.length` |
| 13 | Hashes, goldens and help examples | regenerated in the task that changes the output (status table) | R21; gate ledger GG, GR, GH | reflected |
| 14 | `tech-subset.js` counter | reset per finder call, with a determinism test (status table: settled in the joint report) | R8, in MS03 | reflected |
| 15 | Nightmare numbers | <= 6: 0 of 12 floor-stuck and 0 exact; <= 4: 6 of 12 floor-stuck, 2 of 12 exact | §2.3 | reflected |
| 16 | Easy, offered levels, Killer interaction, help examples, effort units | status table, all agreed | R1, R24, R17, R21, §7 | reflected |

---

## 2. Resolution-by-resolution check

### 2.1 Re-derivation of R1, R8 and the S3 orders

At HEAD the registry holds 26 IDs, 5 of them scoped (`cageCombo`, `ineqChain`, `minMaxForcing`, `ruleOf45`,
`cageSplit`). With the 14 new IDs there are 40, 6 scoped (34 unscoped), as R10 says. Sorted as the registry sorts
(order, then baseCost, then id, `core/js/engine/techniques.js:130-134`), with S2.1's three moves and the orders of R9
and R11-R19, the weights never decrease (format `id order (weight)`):

```text
nakedSingle 10 (1)      hiddenSingleBox 20 (1.25)  hiddenSingleLine 30 (1.5)  pointing 40 (40)
cageCombo 44 (40)       ineqChain 46 (40)          boxLine 50 (50)            nakedPair 60 (120)
hiddenPair 70 (145)     nakedTriple 80 (180)       minMaxForcing 85 (180)     lawOfLeftovers 87 (200)
hiddenTriple 90 (220)   ruleOf45 95 (260)          nakedQuad 100 (260)        hiddenQuad 105 (300)
xWing 110 (320)         skyscraper 112 (330)       twoStringKite 114 (340)    simpleColouring 120 (360)
emptyRectangle 124 (380) finnedXWing 126 (400)     swordfish 130 (420)        remotePairs 132 (440)
finnedSwordfish 134 (480) cageSplit 135 (520)      jellyfish 137 (520)        xyWing 140 (650)
xyzWing 150 (750)       wxyzWing 155 (800)         wWing 170 (850)            uniqueRectangle 180 (900)
bugPlusOne 182 (920)    xyChain 186 (1000)         forcingChain 190 (1100)    alsXz 194 (1250)
sueDeCoq 196 (1300)     forcingChainLong 198 (1400) nishio 200 (1700)         nishioDeep 202 (2600)
```

Equal weights keep their HEAD order (pointing before `cageCombo` and `ineqChain`, `ruleOf45` before `nakedQuad`,
`cageSplit` before `jellyfish`), so the tie rule pinned by `generator/tests/manual/difficulty.test.js:735-747` keeps
its outcomes. Every row of R1's tier table follows from `1.25 w < bandMax` (`generator/js/engine/difficulty.js:344-348`,
written with `SCORING.peakBound`), including Hell 1 = {`nishioDeep`} (3,250 in [2,400, 3,600)) and an empty Hell 2.
With `forcingChainLong` at the plan's 192 (plan:415), MS15's ALS-XZ at 194 / 1,250 would follow a weight of 1,400:
R9's order 198 from MS07 is necessary, not cosmetic.

### 2.2 Per resolution

| R | Verdict | Evidence and notes |
|---|---|---|
| R1 | agree | §2.1. `describe`, `it` and `expect` are globals (`core/tests/harness.js:603-605`); `spec` throws for a level the variant does not offer (`generator/tests/manual/difficulty.test.js:281`), hence "never call `spec(previous)`"; design 6.7 and 13.7 are at `generator/design.md:559, 1602` |
| R2 | agree; C1 | proof, preconditions and sources right (`core/js/engine/logical-solver.js:238-269`; 265-268 re-checks the budget before STUCK). Branch B and the conditional SA2-Q-S02 are precise |
| R3 | agree; N3 | every audit site is at its lines (`generator/js/engine/digger.js:919-936, 1041-1091, 1100-1147, 1320-1499, 1667-1739`; `generator/js/variants/killer.js:824-853, 907-916`; `generator/js/variants/greater-than.js:396-408`); 0.5 for an in-band shallow result is the agreed keeper distance |
| R4 | agree; C2 | `WARNING_KINDS` (`generator/js/ui/result-view.js:24-28`) and `warningModels` (53-66) as described; the `tune.hit` / `tune.miss` argument lists at `generator/js/engine/events.js:850-853`. Missing: the view model's own `exact` and two tool predicates |
| R5 | agree on the policy; C3, C4 | the five bounds are at `digger.js:630-641` with the listed values |
| R6 | agree | `rng.fork(tag)` derives a stream from the seed without advancing the parent (`generator/js/engine/rng.js:77-79`), so the target draw leaves the random and guided streams unchanged; `boundedObjective` (`digger.js:673-697`) as described |
| R7 | agree on the branches; C3, C4, C5 | the early return at `digger.js:1344-1352` is the refinement hand-over |
| R8 | agree; N4 | numbers re-derived (§2.1). Pinned coverage exact: `generator/tests/manual/killer.test.js:511` (`cageCombo: [10, 55]`), 525 (`cageCombo` after `boxLine`); `generator/tests/manual/greater-than.test.js:417-424` (orders 65 and 85); `core/tests/suites/tech-fish.test.js:676-687`; `core/tests/suites/techniques.test.js:41-43` |
| R9 | agree; C3, C4 | `DEFAULT_MAX_NISHIO_DEPTH = 2`, ceiling 3 (`core/js/engine/tech-chain.js:65-66`): today's `nishio` already searches depth 2, so the split moves depth 2 to `nishioDeep`. Finding id and key at 380-385 |
| R10 | agree; N1, N5 | the registration keys are `ALLOWED_KEYS` (`core/js/engine/techniques.js:78-79`); 40 / 34 verified. Cost branch B is monotone between existing neighbours (xWing 32 < 33 < 34 < simpleColouring 36 < 38 < 40 < swordfish 42 < 44 < 48; xyzWing 54 < 57 < wWing 60; uniqueRectangle 66 < 72 < 82 < forcingChain 90 < 106 < 112 < 118 < nishio 140 < 210) |
| R11-R16 | agree | proofs rechecked: skyscraper, kite, the restricted empty rectangle, finned and sashimi fish, remote pairs with at least three edges, WXYZ, UR types 3, 4 and hidden, BUG+1 guards, the restricted XY-chain, grouped nodes with all-pairs weak links. Anchors exact: `core/js/engine/tech-fish.js:56-125`, `core/js/engine/tech-wing.js:349-399`, `core/tests/suites/techniques.test.js:64-69`, `core/js/engine/tech-chain.js:78-112, 353-385`, `player/js/ui/play.js:226-245`, `player/js/ui/i18n.js:240-246`, `generator/js/ui/i18n.js:252-258` |
| R17 | agree; C7 | no quick suite tests `cageCombo` today (only the manual `generator/tests/manual/killer.test.js:559-574` and locale keys); `pointOutOfCage` is a helper of `cageCombo` (`core/js/engine/tech-cage.js:118-139`), not an ID |
| R18, R19 | agree | the ALS-XZ and Sue de Coq capacity arguments hold. The eight source lists exist and all list `tech-wing.js` today; `CORE_SUITE_FILES` is at `generator/tests.html:129` and `player/tests.html:135` |
| R20 | agree on A, B, C; C6 | branch B as written cannot be selected without more text |
| R21 | agree; C11 | verified: `generator/tests/replay-fixtures.js` writes wire data only; the help tool joins its output with LF, uses `os.tmpdir()` and applies `--puzzles` to stage 2 only (`player/tests/tools/make-technique-examples.js:227, 238, 243`); `generator/tests/perf.js` update and check modes ignore the filters (122-126, 195-218, 246-247); the smoke suite pins 11 cells (`generator/tests/suites/smoke.test.js:17-19`) |
| R22 | agree; C8 | `RATING_VERSION = 2` (`generator/js/engine/difficulty.js:58`), cache `SCHEMA_VERSION = 2` (`generator/js/ui/cache.js:47`), `sameResult` 277-284; design 14.1 is the JSON schema (`generator/design.md:1754`), "Known limitations and ideas" is at 2004 |
| R23 | agree; C10 | soak options verified (`--count`, `--variant`, `--level`, `--no-gate`, `--include-unsupported`; `--quick` about 700 puzzles; `--per-combo` gives 4N per classic9 level: `generator/tests/soak.js:8-9, 52-59`); 812.5 and 3,250 correct |
| R24 | agree; C9 | protocol verified (`generator/tests/qualify.js:12-27, 56-60`; every level enabled in the worker at 143); the 135 rows (`generator/tests/manual/difficulty.test.js:297-317`) |
| §4 | agree | D1-D16 mapped correctly; the additional corrections are right |
| §5 | agree; C2, C4, C7 | §5 below |
| §6 | agree; C9, C10 | every command matches its tool's option parser; `--suite=difficulty` runs a manual suite by name (`generator/tests/node-runner.js:127`) |
| §7, §8 | agree | the per-task ranges sum to 58-90 agent hours |
| §9 | C11 | |

---

## 3. Required changes

**C1. R2 branch A: the order of the cases (draft:195-204).** Replace the text from "For a current complete canonical
rating, return the vacuous result or:" to "return null, and exactness is false." by:

```text
requiredOf(rating, level, model)                  // pure, no solve
  1. rating is null, or rating.solved !== true
       -> null                                    // no certificate; never exact; events report required: null
  2. levelIndex(level) === 0, or tierTechniques(level, model.variantId) is empty
       -> { required: true, vacuous: true, floorLevel: null }
  3. otherwise
       -> { required: some id with rating.techniqueCounts[id] > 0 is not in floorTechniques(level, model.variantId),
            vacuous: false,
            floorLevel: LEVELS[levelIndex(level) - 1] }
```

and add: "Canonical origin (precondition 4) is the caller's obligation: `requiredOf` cannot detect a stale, imported
or restricted report, so callers pass only ratings made by `rateCounted` / `SG.difficulty.rate` on this model and
these givens." Reason: R4's events need `null` for an unrated result at every level, including VeryEasy (SA2-3 §1.2
item 3: missing evidence is not a positive vacuous result); the draft names the vacuous case first and promises a
staleness test the function cannot make.

**C2. R4 and MS05: three missing consumers and the tests that change on purpose (draft:312-318, 1093).** Add to R4's
sources and to MS05's files:

- `generator/js/ui/result-view.js:165`: the view model computes `exact: requested === achieved`; it must read the
  result's exactness (R4's wire field).
- `generator/tests/soak.js:226`: the pipeline path computes `exact: r.rating.level === combo.level`.
- `generator/tests/qualify.js:170`: `hit = valid && solved && !approximate && rating.level === task.level`; it must
  read the same exactness (it is right only as long as every non-exact result carries `difficulty.approximate`).

List these tests in MS05 as intended contract changes (the repository rules forbid other edits of failing tests):
`generator/tests/suites/result-view.test.js:66` (`vm.exact === (rating.level === 'easy')`);
`generator/tests/manual/difficulty.test.js:1182` (the 90 % hit test counts `p.achieved === level`; count `p.exact`),
`:1212` (I5 asserts `p.exact === (p.achieved === level)`; it becomes "exact implies solved, achieved === level and
required") and `:1363` (`digLevel`, the same change). Re-check `generator/tests/suites/pipeline.test.js:309, 1144`
(they assert the final event's `exact`). Add GD to MS05's gates: `node tests\node-runner.js --suite=difficulty` once;
I5 and the `digLevel` test must pass; hit-rate failures at levels where required puzzles are rare are recorded as
intermediate availability evidence (R24), not fixed.

**C3. R5-C, R7-C, R9-C: how the measurements run (draft:348, 444, 506-512).** The three branches compare runs on
"seeds 1..12" but name no tool, and R5-C and R9-C compare values of a constant without saying how a second value is
run. Add one paragraph to R5 and refer to it from R7 and R9:

"Measurements use `generator/tests/soak.js`, one shard per cell, with
`--variant=<id> --level=<id> --count=12 --seed=20260101 --no-gate`; 'seeds 1..12' reads 'the 12 requests of soak's
default base seed'. A value under comparison is one constant exposed on its module and read at run time (R5: the
additional shallow cap in `SG.digger`, `Infinity` meaning none; R9: the short-chain maximum in the chain module). Soak
gets one diagnostic override per constant, like its `--weights` and `--bands`
(`generator/tests/soak.js:87-88, 147-148`): `--shallow-cap=<n|none>` (MS05) and `--chain-window=<n>` (MS07, which then
also owns `generator/tests/soak.js`); off by default and never used in a gate run. The records are
`docs/difficulty-v3/shallow-cap-<date>.md` (MS05), `docs/difficulty-v3/target-scope-<date>.md` (MS06, R7-C) and
`docs/difficulty-v3/chain-window-<date>.md` (MS07): commands, per-cell exact, shallow and missed counts, full ratings
and times."

A temporary edit of the constant between two runs, reverted before the task ends, is an acceptable alternative to
the overrides if the authors prefer it; the tool, the manifest and the record file must be named either way.

**C4. The final-S3 rechecks of R5-C, R7-C and R9-C, and MS18's files (draft:350, 446, 511-512, 1106).** As written,
a recheck that selects another value changes `generator/js/engine/digger.js` or `core/js/engine/tech-chain.js`
inside MS18, whose file list has only "selected chain constant only if measured-rule final recheck changes it" and
whose gates do not re-record hashes, goldens and help examples before GQ-final. Replace the three recheck sentences by:

"MS18 repeats the measurement with the same shards and records it. If the rule then selects another value than the
one in force, MS18 stops before GQ-final and the orchestrator asks the owner: keep the value, or insert a task that
changes it and re-runs GG, GR, GH and GD before MS18 resumes. MS18 changes no generation or solver logic or constant."

and delete "selected chain constant only if measured-rule final recheck changes it" from the MS18 row. If the
authors prefer automatic re-selection, the branch must say so and give MS18 `generator/js/engine/digger.js`,
`core/js/engine/tech-chain.js` and the gates GG, GR, GH and GD before GQ-final. SA1 recommends the escalation text.

**C5. R7-C: the inconclusive case (draft:444).** Replace "If fewer than 10/12 are exact, the experiment is
inconclusive, not a reason to skip requiredness work." by "If fewer than 10 of the 12 requests are exact, the result is
inconclusive: branch A stays, the record says so, and the owner may still select B." The draft says what an
inconclusive result is not, but not what is implemented.

**C6. R20-B: the protected set and the value rule (draft:863).** "B requires the answer to name the protected fixture
set and an authorized value-selection rule/range" leaves branch B unselectable. Replace that sentence by a complete
default that the answer can accept or amend:

"Protected set: the constructed reference puzzles of `generator/tests/fixtures/rated.js` (plan:507-508); published
external puzzles keep their external labels and are not protected. Rule, applied in the task that introduces t: if a
protected puzzle changes level because its rating now uses t, set w(t) to the value closest to the plan's prior in
[bandMin(tier(t)) / 1.25, bandMax(tier(t)) / 1.25) intersected with [w(previous id), w(next id)] (R8's order window)
that keeps the most protected puzzles at their labels; if no value keeps any, keep the prior and record the
reclassification. One value per id for every variant; existing weights and bands unchanged."

**C7. R17 and MS14: the quick cage suite does not exist (draft:801, 1102).** "Subset/cage suites": there is no quick
cage suite (`core/tests/suites/` has no `tech-cage.test.js`). Name it in R17 and MS14: "a new quick suite
`core/tests/suites/tech-cage.test.js` (both runners discover `../core/tests/suites` by themselves,
`generator/tests/node-runner.js:105`, `player/tests/node-runner.js:69`), added to `CORE_SUITE_FILES` of
`generator/tests.html:129` and `player/tests.html:135`, with Killer boards built by the core model builder; if a Killer
board needs generator-only code, `generator/tests/suites/killer-cage.test.js` added to `SUITE_FILES` of
`generator/tests.html` instead." MS14 owns these files.

**C8. R22: the history store's version (draft:915).** Add: "Keep the history store's `VERSION = 1`
(`generator/js/ui/history.js:19`): `read` returns an empty list for any other stored version (153-156), so a bump
would erase every user's history. Add `ratingVersion` to `STORED_FIELDS` (21, used by `storedEntry`, 92-98) and write
it for new entries; `validEntry` (100-103) keeps accepting entries without it, which the list shows as made by an
earlier version."

**C9. Gate ledger GQ-first and GQ-final: job count and scope (draft:1132-1136).** Replace `--jobs=1` by `--jobs=4`
in GQ-first and state it in GQ-final: the published v2 table was made with 4 worker processes
(`docs/difficulty-rating/qualification.md:32`), the p95 budgets are part of the verdict, and more jobs only make
requests slower (`generator/tests/qualify.js:31-33`); the job count is recorded and runs with different job counts are
not compared. State GQ-first's scope: the same 135 cells as GQ-final (PROC-S1 (a): `qualify.js` after S2.2 and at the
end), in `--variant` shards, written to `docs/difficulty-v3/qualification-checkpoint-<date>.md` and `.json`, never to
the live table.

**C10. R23 and MS02: the GS-before cells (draft:929-953, 1090, 1128).** The draft gives the command, not the cells, so
GS-after (MS18) has no fixed manifest to repeat. Add: "GS-before cells, 12 requests each (`--count=12
--seed=20260101 --no-gate`, one shard per cell): classic9 normal, hard, expert, master, nightmare, hell1; killer
normal, hard, expert; jigsaw9 normal, hard, expert, nightmare; greaterThan normal, hard, expert; diagonalX nightmare.
They include every cell of the R5, R7 and R9 comparisons. GS-after repeats exactly these cells on the final code."

**C11. AUTH-S2's status (draft:868, 896, 1220, 1226).** The status table and part C of `clarifications.md` now record
AUTH-S2 as agreed (a). Change R21's header to "FINAL; AUTH-S2 agreed (a), plan author to confirm" (or keep the
draft's PENDING label for author confirmations, as for SA1-Q-S7, but say "agreed"); delete "The clarification table
still attributes SA2's older order to it." (draft:896) and "AUTH-S2's attributed SA2 position should be reconciled
with the third response by the orchestrator; this draft does not edit the clarification file." (draft:1226); keep
branch B only as the author's alternative.

---

## 4. Non-blocking notes

- **N1. Risk: new finders consume the objective guard.** Every `ctx.check()` of a solve counts against the guided
  dig's 100,000-check guard (`generator/js/engine/digger.js:641, 679-697`), and R10 adds a check at entry and every 256
  units in each new finder. Record `digger.objectiveGuard` refusals per level in the GS and GP shards of MS13, MS15
  and MS18; R5 keeps `OBJECTIVE_STEPS` fixed, so a needed change is an owner decision. Add a row to §7's risks.
- **N2. Weight overrides and precondition 1.** `soak.js --weights` changes `SG.difficulty.WEIGHTS` at run time
  (`generator/tests/soak.js:147`) and can break R8's invariant, on which R2-A relies. Soak should check the invariant
  after an override and refuse it (or count exactness with `certifyFloor`).
- **N3. Greater-Than in MS05.** R3 audits `generator/js/variants/greater-than.js:396-408`, but MS05's files do not list
  it. Say "no edit expected (the keeper receives the thinned model, 396-405); if one is needed, MS05 owns the file".
- **N4. More anchors.** R8 and R9: `core/tests/suites/tech-chain.test.js:512-537` pins the chain registrations
  (`forcingChain` 190, `nishio` 200, every non-chain id below 190); it stays true with the final orders (`bugPlusOne`
  182 is the last non-chain id), and the new chain ids need their own registration assertions. R10: the per-id
  obligations are checked by `core/tests/suites/techniques.test.js:71-74` (fixtures) and
  `player/tests/suites/help.test.js:126-129` (help examples).
- **N5. SA2-Q-S08.** SA1 recommends cost branch B (§2.2, R10): it is the concrete form of SA1's "positive costs
  increasing with weight" and changes no existing cost.
- **N6. MS05's prerequisites.** Name SA2-Q-S12 in MS05's "depends on" column, with "branch A until answered".

---

## 5. Task breakdown: draft against SA1-3 §5

| Task | SA1-3 §5 (signed) | Draft | Result |
|---|---|---|---|
| MS01, MS02, MS04 | same scopes; MS04 before MS03 | same | match; C10 for MS02 |
| MS03 | orders, ladder split, counter reset | the same, plus the activation of the derived helper (R2) | match |
| MS05 | depends on SA2-Q-S06 and SA2-Q-S12 | depends on MS03 and the R2 mechanism | match; C2, N3, N6 |
| MS06 | target, comparator, stop rule, SA2-Q-S03 scope | the same | match; C3, C5 |
| MS07 | the live qualification table, support lists and offered table at the checkpoint | checkpoint evidence only | the draft is right (E20); C3, C9 |
| MS08 | three patterns; split the rectangle off if over L | the same | match |
| MS09-MS13, MS15, MS17 | as in the draft | | match |
| MS14 | "a focused cage test" | "subset/cage suites" | both incomplete: C7 |
| MS16 | Sue de Coq and order 198 | Sue de Coq only; 198 in MS07 | the draft is right (E19) |
| MS18 | final evidence; qualification record per AUTH-S1 | the same, plus "selected chain constant only if ..." | C4 |
| Gates | GG, GR, GH in the owning task; GQ after S2.2 and at the end | the same | match; C9, C10 |

With C1-C11 applied, this is the breakdown I sign: MS01 -> MS02 -> MS04 -> MS03 -> MS05 -> ... -> MS18, one developer
at a time, the gate owners of the draft's §6.

---

## 6. Errata to SA1-3

| Id | SA1-3 text | Correction |
|---|---|---|
| E19 | §5, MS16 row: "Sue de Coq; `forcingChainLong` order 198" | order 198 from MS07 (R9): at 192 (plan:415) it would precede ALS-XZ (194, weight 1,250) with weight 1,400 once MS15 registers ALS-XZ |
| E20 | §5, MS07 row: "at the checkpoint `docs/difficulty-rating/qualification.md`, the variants' `difficultySupport` lists and the offered table of `generator/tests/manual/difficulty.test.js`" | the checkpoint writes its own evidence files; only MS18 changes the live table, the support lists and the offered-table reader (SA1-3 §4 rows 7 and 22) |
| E21 | §3: `requiredOf(R, L) = R.solved and ...` gives false for an unsolved rating | null, no certificate (C1); exactness is false either way |

---

## 7. Sign-off

SA1 (claude-opus-5.5), 2026-11-12: **signed subject to the listed changes** (C1-C11).
