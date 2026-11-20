# Rating v3: independent implementation-plan review

SA2, gpt-6-astra. Reviewed 2026-11-12 against branch `rating-v3`, commit `6abcb9f`.
This is the independent analysis. No SA1 report was read.

The scope is the full S0-S3 plan, all six S3 groups, and S2.3. The owner has pre-approved the plans'
APPROVAL GATE runs for implementing developers; none of those runs was run during this analysis.
Recommendations that change behaviour remain owner questions, not adopted decisions. The decisions in
`docs/difficulty-v3/plan.md` section 1.3 are fixed: required lower-tier failure, one qualifying step sufficient, unchanged
existing weights unless separately calibrated, and a new rating version.

## 0. Summary and verdict

The plan correctly identifies score-only exactness and a highest-score guided objective. Its probe table
reproduces exactly. It is not yet a safe developer specification. Several proposed tests contradict the
derived tiers, the keeper change is incomplete, and the technique work omits substantial fixture/help
integration and some necessary soundness conditions.

The ten most important findings:

1. **The veryEasy tier definition contradicts the supplied code and tests.** `allowed(veryEasy)` contains
   three singles. Subtracting an empty floor yields those singles, not an empty tier. The proposed
   certificate can then report an undefined floor level (`docs/difficulty-v3/plan.md:164-184`).
2. **The constructed-fixture floor test is false.** Entries use `label`, not `level`; normal-1, normal-3
   and all three Nightmare constructed puzzles are solved by today's actual lower-level allowed set.
   The old certificates describe technique families, not v3 weight-derived tiers
   (`generator/tests/fixtures/rated.js:103-179`).
3. **The keeper can retain shallow puzzles as distance zero.** `createKeeper.offer` calculates and
   prefilters distance before the proposed certification insertion. `keeper.closer` is called even earlier
   by local search and Killer. Certify or perform a safe optimistic precheck before ranking, then recompute
   the distance (`generator/js/engine/digger.js:1041-1070, 1463`; `generator/js/variants/killer.js:907`).
4. **Missing certification must not mean exact.** The suggested `rating.floor === undefined` fallback
   defeats the acceptance invariant. Contradiction and budget exhaustion are also not proofs that the
   lower tier gets stuck (`core/js/engine/logical-solver.js:22-23, 334-343`).
5. **S1.2 terminates, but its objective handling is incomplete.** Finite clue removal/rejection prevents
   an infinite loop; however its stopping condition can downgrade a tier-using state, and applying a
   finite-band target to `STUCK_SCORE` proposal values reverses the top-tier proposal heuristic.
6. **Hard does not currently “hug the top” in the supplied sample.** Its median band position is 0.56,
   with only 3/24 in the top quarter. Expert does hug the top: 9/12. Moreover all 24 Hard and all 12 Expert
   samples already pass the proposed floor check; 5/12 Normal samples fail it.
7. **Fixed weights prevent uniform coverage of several bands.** A certified Expert using XY-Wing has
   a technique subtotal >=812.5 before empty-cell/work additions; new `nishioDeep` starts >=3250 inside
   Hell 1's [2400,3600) band. Uniform raw targets do not imply uniform attainable scores.
8. **S2.1's proposed orders are consistent with the final S3 table**, including `forcingChainLong=198`,
   but additional tests pin old orders and the frozen classic fixture ladder. Moving only three source
   registrations and adding one assertion will not leave the quick suites green.
9. **S3 is a major solver-and-fixture project, not six small edits.** Grouped nodes cannot be added to
   the current `cell * digits + digit` graph without extending node representation, scratch bounds and
   proof serialization. BUG, rectangles, finned fish and ALS need precise variant guards and proofs.
10. **Several integration instructions are wrong or incomplete.** Killer's stated cage interactions
    already exist; Killer/Greater-Than suites are manual, not quick; `player/js/ui/help-examples.js` lives under
    `player/js/ui/`; `generator/tests/replay-fixtures.js` updates only four wire fixtures, not the 14 golden analyses;
    `generator/design.md` section 14.1 is JSON format, not limitations.

## 1. Baseline

### 1.1 Quick tests at HEAD

Windows/PowerShell, Node `v26.13.0`. Repository branch and HEAD match the request. CI's documented Node
version is 24 (`AGENTS.md:5`), so these results are local evidence, not a substitute for that CI matrix.
No tracked code was edited, staged or committed.

| Command | Suites / tests | Result | Duration |
|---|---|---|---|
| From `generator/`: `node tests\node-runner.js` | 43 suites, 2,818 tests | 2,818 pass; 0 fail/skipped; 63 source files loaded, none missing | Test time 111.58 s; runner total 112.08 s; command 112.301 s |
| From `player/`: `node tests\node-runner.js` | 29 suites, 1,609 tests | 1,609 pass; 0 fail/skipped; 39 source files loaded, none missing | Test time 24.73 s; runner total 24.94 s; command 26.276 s |

Both print Node's experimental localStorage warning; it is not a failure. Shared core suites appear in both
counts, so 4,427 is the number of executed test cases, not the number of distinct tests.
No `--all`, `--manual`, soak, perf, qualify, hash updater, generated-help updater, browser script or HTML
test runner was run. All probes below were in-memory, bounded read-only scripts.

### 1.2 Reproduced plan section 7 probe

Loaded the engine entries in `generator/tests/node-runner.js:30-93` order with the plan's VM loader.
After a reduced sample, reproduced its full small sample: 24 Hard, 12 Normal, 12 Expert, seeds 1..N,
classic9, `trace:'off'`. The aggregate table matches exactly.

| Requested | N | Peak histogram | Min / upper median / max | Top-quarter count | Actual lower-tier solve |
|---|---:|---|---|---:|---|
| normal | 12 | nakedPair 5, hiddenPair 4, nakedTriple 3 | 209 / 261 / 315 | 0/12 in [345,400) | 5 solved, 7 stuck |
| hard | 24 | simpleColouring 21, xWing 2, swordfish 1 | 497 / 568 / 699 | 3/24 in [625,700) | 24 stuck |
| expert | 12 | xyWing 12 | 887 / 958 / 989 | 9/12 in [925,1000) | 12 stuck |

The full generation-plus-floor probe took approximately 0.655 s / 0.731 s / 0.497 s respectively on this
run; these tiny warm samples are not performance qualification. No warnings occurred in the reduced
sample. The plan's Hard seed 3 has only nonbasic `simpleColouring:2`; seed 8 has `pointing:1`,
`simpleColouring:1`, exactly as stated.

`SG.pipeline.run` does **not** return an `exact` property today. It emits exactness in the done event but
returns model/givens/solution/rating/config/warnings/digLog (`generator/js/engine/pipeline.js:234-254`). A future acceptance
probe must inspect `SG.digger.generate(...).exact`, the done event, or an explicitly added pipeline field;
testing `result.exact` on the current pipeline result is not meaningful.

### 1.3 Constructed-fixture floor probe

For each fixed constructed entry, used `entry.label`, the actual classic9 lower-level `spec`, and the
logical solver with `assumeUniqueness:true`. All fixtures are documented unique; the probe did not modify
their certificates.

| Constructed entries | Lower-tier outcome |
|---|---|
| easy-1, easy-2, easy-3 | All solved; the old entries have no `notSolvableWith` certificate |
| normal-1 | Solved, despite old family certificate |
| normal-2 | Stuck, 36 unsolved cells |
| normal-3 | Solved, despite old family certificate |
| hard-1, hard-2, hard-3 | Stuck, 23 / 30 / 29 unsolved cells |
| expert-1, expert-2, expert-3 | Stuck, 30 / 39 / 17 unsolved cells |
| nightmare-1, nightmare-2, nightmare-3 | All solved by today's Master allowed set, despite old family certificates |

Consequently S0.1 cannot assert `required === true` for every old certified entry. Family “locked” lacks
nakedPair; the real Easy floor includes it. Family “wings” lacks forcingChain; the real Master floor
includes it. Keep the historical certificates as they are and add v3-specific expected floor outcomes.

## 2. Findings verified

### 2.1 Every code-level cause and section 1.1 observation

| Plan claim | Verdict / actual anchor | Evidence and correction |
|---|---|---|
| Formula `V+P+0.25P log2(1+W/P)`, score-only classification | Verified: `generator/js/engine/difficulty.js:5-13, 233-271, 392-426` | One final rounding; an incomplete proof has null level/score. |
| `spec` permits techniques whose `1.25*w < max` | Verified: `generator/js/engine/difficulty.js:334-370` | Variant filtering uses exact `model.variantId`; order is registry ladder order. |
| Guided dig chooses highest score below max | Verified: `generator/js/engine/digger.js:654-702, 719-794` | Proposal mode is different: unique puzzle plus numerical “stuckness” priority. |
| Exact means solved and matching level | Verified: `generator/js/engine/digger.js:1085, 1266` | Outer `1687/1712` checks inherited `exact`. There are also keeper-distance early stops at `1667` and `1689`. |
| Closeness ignores technique | Verified: `generator/js/engine/digger.js:1507-1515` | Gap first, then normalized score distance. All solved in-band ratings have distance zero. |
| Local search stops on entering band | Verified: `generator/js/engine/digger.js:1392` | It also stops on full-rating/proposal caps, and rejects decreasing-score moves at `1469`. |
| cageCombo/ineqChain/jellyfish ladder inversions | Verified: `core/js/engine/tech-cage.js:613-623`; `core/js/engine/tech-ineq.js:476`; `core/js/engine/tech-fish.js:518-529`; weights `generator/js/engine/difficulty.js:70-97` | Proposed 44/46/137 fixes those inversions while preserving the documented equal-weight hardest-technique ties. |
| One forcing-chain and one Nishio ID | Verified, with default-depth correction: `core/js/engine/tech-chain.js:62-66, 389-426, 472-536` | Chain default is 12, configurable beyond 12; Nishio default is **2**, ceiling 3, not default 3. |
| Weights are engineering priors | Verified: `generator/js/engine/difficulty.js:38-40`; `docs/difficulty-rating/report-detailed.md:479-480` | Existing weights are fixed for this plan unless the owner later authorises calibration changes. |
| Cheapest expensive technique once can enter a band | Verified as a lower-bound argument, not a universal generation law | `W>=P` gives technique term >=1.25P. Reduced samples include two colouring uses and the Swordfish sample includes several other advanced uses. |
| Scores hug the top | Partly wrong for the supplied sample | Expert does; Hard median is 56% through its band and only 12.5% are in its top quarter. The maximising algorithm is real even when output distribution is not top-heavy. |
| No tier-required check | Verified | Current Normal sample gives five explicit shallow cases; Hard hidden-quad peak is mathematically possible even though it did not occur in the supplied Hard sample. |
| `BASE_GROUPS` no longer defines levels | Verified: dated report at `docs/difficulty-rating/report-detailed.md:500`; current source `generator/js/engine/difficulty.js:52-56` | Family certificates must not be reinterpreted as weight-tier certificates. |

### 2.2 Tier derivation and order validation

With today's registry and weights, the actual unfiltered differences are:

| Level | New IDs admitted, in current ladder order |
|---|---|
| veryEasy | nakedSingle, hiddenSingleBox, hiddenSingleLine |
| easy | pointing, boxLine, cageCombo, nakedPair, ineqChain |
| normal | hiddenPair, nakedTriple, minMaxForcing, hiddenTriple, ruleOf45, nakedQuad, hiddenQuad |
| hard | xWing, simpleColouring, swordfish, cageSplit, jellyfish |
| expert | xyWing, xyzWing |
| master | wWing, uniqueRectangle, forcingChain |
| nightmare | nishio |
| hell1 | Empty |
| hell2 | Empty |

The plan's sets are otherwise correct as sets, but not always in ladder order. On classic9, remove the
cage/inequality IDs, yielding exactly `['xWing','simpleColouring','swordfish','jellyfish']` for Hard.
The variant is `killer`, not `killer9` (`generator/js/variants/killer.js:1208`; registry scope
`core/js/engine/tech-cage.js:623`). `jigsaw9` is correct (`generator/js/variants/jigsaw.js:722`); Greater-Than is
`greaterThan`, not the test filename `greater-than`.

S2.1 and the final S3 order/weight table are mutually consistent if the long chain moves to 198:

```text
pointing 40/40, cageCombo 44/40, ineqChain 46/40, boxLine 50/50,
[cageLocked 57/60 only if truly needed], nakedPair 60/120, hiddenPair 70/145,
nakedTriple 80/180, minMaxForcing 85/180, lawOfLeftovers 87/200,
hiddenTriple 90/220, ruleOf45 95/260, nakedQuad 100/260, hiddenQuad 105/300,
xWing 110/320, skyscraper 112/330, twoStringKite 114/340, simpleColouring 120/360,
emptyRectangle 124/380, finnedXWing 126/400, swordfish 130/420,
remotePairs 132/440, finnedSwordfish 134/480, cageSplit 135/520, jellyfish 137/520,
xyWing 140/650, xyzWing 150/750, wxyzWing 155/800, wWing 170/850,
uniqueRectangle 180/900, bugPlusOne 182/920, xyChain 186/1000,
forcingChain 190/1100, alsXz 194/1250, sueDeCoq 196/1300,
forcingChainLong 198/1400, nishio 200/1700, nishioDeep 202/2600.
```

Each pair is `order/weight`; singles precede these unchanged. Equal weights are valid. Test the actual
sorted registry's adjacent weights with `<=`, not only pairs with strictly different order numbers:
registry ties also use baseCost/id (`core/js/engine/techniques.js:148-153`).

Final classic Hard has ten IDs: its four old IDs plus three group-1 patterns, two finned fish and remotePairs.
WXYZ-Wing is Master, because `1.25*800=1000` does not fit Expert's exclusive upper edge.
ALS-XZ/Sue de Coq and long chains are Nightmare; nishioDeep is Hell 1. Hell 2 remains a vacuous tier.

## 3. Anchors, APIs and omitted integration

### 3.1 Orientation and step-anchor audit

| Reference | Actual contract / correction |
|---|---|
| `generator/js/engine/difficulty.js` | `RATING_VERSION:58`, weights `70-97`, TABLE `104-114`, `breakdown(counts,empties):233`, `spec(level,model):334`, `classify(report,model):392`, `rate(model,givens,options):442`; all orientation names exist. |
| `generator/js/engine/digger.js` stage functions | `digSteps:449`, `removalObjective:654`, `digGuidedSteps:719`, `digStageSteps:821`, `refineDown:1100`, `digLevelSteps:1172`, `localSearchSteps:1320`, `generateSteps:1572`; named APIs exist. Generator functions have `function*`, not ordinary-return semantics. |
| Digger helpers / acceptance | `rateCounted:991`, `createKeeper:1041`, `keptPuzzle:1075`, rate stage `1255`, exact `1266`, local loop `1392`, distance `1507`, outer exact/finish `1687-1741`. Plan insertion points are real but omit early keeper prefilters. |
| Logical solver | Actual path `core/js/engine/logical-solver.js`; `solve:316`; options `55-67`; result `334-343`. State really has `unsolvedCount`. Reports distinguish `stuck`, `solved`, `contradiction`; budget errors propagate. |
| Technique registration | `core/js/engine/techniques.js:8-71, 154-181`; mandatory `baseCost`, `order`, `i18nKey`, `find`; optional scope and uniqueness flag; unknown keys rejected. Finding.technique must equal registered ID (`core/js/engine/logical-solver.js:154-157`). |
| RNG | `generator/js/engine/rng.js:1-4, 88-92`; forks derive from immutable seed/tag and do not consume parent state. New target stream is technically sound. |
| Events | `generator/js/engine/events.js:769-777` describes optional allowed argument names, not an argument-type schema; tune entries `850-853` are correct. New `required` should be documented boolean-or-null if uncertified ratings are represented. |
| Replay log | Orientation description `{op:'remove'|'reveal'}` is wrong for the raw dig log. `generator/js/engine/digger.js:360-378` writes `accept`, `reject`, `keep`, `pass`, `reveal` etc.; `generator/js/engine/replay.js` turns accepted entries into moves. Keep raw `keep.score` numeric/null. |
| Cache/export/import | Cache schema is 2 at `generator/js/ui/cache.js:47`; export ratingVersion whitelist at `generator/js/ui/export.js:137`; importer positive-safe-integer handling at `player/js/ui/importer.js:632-633` verified. |
| History | `generator/js/ui/history.js:1-8, 21-22, 60-80` stores summary/configuration, not an entire rating or old puzzle. There is no ratingVersion field. Selecting a history entry regenerates the seed with the current engine. |
| Rated fixtures | `generator/tests/fixtures/rated.js:103-112, 120-179`; property is `label`; certificates are arrays of IDs from frozen family sets. New IDs must not silently rewrite old certificate meanings. |
| Manual difficulty assertions | `generator/tests/manual/difficulty.test.js:721-747, 759-767, 1316` anchors correct. `generator/tests/suites/replay.test.js:1601` is a stubbed test rating, not a production-version assertion. |
| Additional pinned tests | `core/tests/suites/tech-fish.test.js:676-687` pins jellyfish=160; `generator/tests/manual/killer.test.js:511, 525` pins cageCombo=55/after boxLine; `generator/tests/manual/greater-than.test.js:417-424` pins ineqChain=65. |
| Shared generic fixtures | Missing from plan: `core/tests/fixtures/techniques.js:33-45` has frozen classic ladder and per-ID fixtures; `core/tests/suites/techniques.test.js:40-107` requires exact ID parity, two positive/one negative fixtures, and currently only UR uniqueness assumptions. |
| Test harness | The actual style is global `describe`, `it`, `expect`, plus `SG.test` helpers, not a required `SG.test.describe/it/assert` API. See `generator/tests/suites/technique-weights.test.js:13-35`. |
| “Quick” variant suites | `killer`, `greater-than`, `jigsaw`, and `difficulty` are in `generator/tests/manual/`. Explicit `--suite` finds them even without `--manual` (`generator/tests/node-runner.js:12-18, 123-126`). These are approved developer gates, not analysis quick tests. |
| Replay updater | `generator/tests/replay-fixtures.js:5-12, 20, 74-89` regenerates only `generator/tests/fixtures/replay-wire.js` G09-G12. It does not update `generator/tests/fixtures/replay-goldens.js`'s 14 expected analyses. |
| Help source and data | Player catalogue is generated dynamically by `player/js/ui/help.js:225-269`, not handwritten in `player/help.html`. Actual generated examples: `player/js/ui/help-examples.js`; updater: `player/tests/tools/make-technique-examples.js`. |
| Locales | `generator/js/ui/locale.en.js`, `generator/js/ui/locale.vi.js`, `player/js/ui/locale.en.js` and `player/js/ui/locale.vi.js` exist. Include names, descriptions and step subkeys, not only `.step`. Both `generator/js/ui/help.js` and `player/js/ui/help.js` also own language fragments. |
| Design sections | `generator/design.md`: 6.6 at 475; 6.7 at 559; 6.8 at 597; 12.2 at 1514; 13.7 at 1602. **14.1 at 1754 is JSON schema**. “Known limitations and ideas” is at 2004. Update both where applicable. |

The companion checkout reference is obsolete; all paths here are relative to this repository.

### 3.2 Script/suite lists and direct touch-list additions

For `core/js/engine/tech-als.js`, update all eight source lists in dependency order:

1. `generator/index.html`
2. `generator/tests.html` (`SOURCE_FILES`)
3. `generator/tests/node-runner.js`
4. `generator/js/worker/gen.worker.js`
5. `player/index.html`
6. `player/tests.html` (`SOURCE_FILES`)
7. `player/tests/node-runner.js`
8. `player/help.html`

If adding `core/tests/suites/tech-als.test.js`, also add it to **both** HTML `CORE_SUITE_FILES`.
For `generator/tests/suites/difficulty-floor.test.js`, add it to `generator/tests.html`'s `SUITE_FILES`.
Node discovery is automatic, but `ui-contract` checks browser list parity even in the quick Node run
(`generator/tests/suites/ui-contract.test.js:531-567`; `player/tests/suites/ui-contract.test.js:578-599`).

Other necessary integration:

- `generator/js/ui/result-view.js:53-66`: warning formatting currently supplies no `{level}` arguments.
- `generator/js/engine/pipeline.js` and `generator/tests/soak.js:211-227`: exactness is not returned by the
  pipeline and the soak reconstructs it from score alone on variant paths.
- `generator/js/ui/cache.js:277-284`: regenerated-cache equality currently compares grids and score/level,
  not floor status/model version. Purging v2 is necessary; compare relevant v3 acceptance metadata too.
- Both apps' help tests/doc counts; `player/design.md:37, 219, 346, 408, 421`; root guides in both languages.
- `generator/tests/fixtures/replay-goldens.js` and its regeneration method, not just replay wire snapshots.
- `docs/difficulty-v3/qualification.md` plus changed living links/manual assertion path, rather than editing
  the dated v2 qualification record contrary to the plan's own preservation rule.

## 4. Step-by-step review

### S0.1: tier sets and `certifyFloor`

Extracting `allowedFor(i,variantId)` is straightforward and can preserve all current output. Keep variant
scope matching exact IDs and derive the previous **global** level's set even if that level is not offered
for this variant; offered lists may have gaps. Do not call `spec(previousLevel,model)` to derive a floor,
because it can throw `difficulty.unsupportedLevel`.

VeryEasy needs an explicit base case. The three desired statements in the plan cannot all hold:

```text
floor(veryEasy) = []
tier = allowed minus floor
tier(veryEasy) = []
```

Recommendation, pending Q-S01: keep the actual set difference (three singles), and make certification
vacuous explicitly when `levelIndex===0`. Then the union/disjointness invariants remain true and
`floorLevel:null` is intentional. Hell 2's empty tier is separately vacuous; an empty tier at any variant
must use the same agreed rule.

A safe certificate should distinguish a real stuck solver from unavailable evidence:

```text
FloorCertificate = {
  level, floorLevel: string|null, ratingVersion,
  status: 'required'|'shallow'|'vacuous'|'unverified',
  required: true|false|null, vacuous: boolean,
  unsolvedCount: integer|null, checks: integer
}
```

Contract:

- `solved` -> shallow, `required:false`, unsolvedCount 0.
- `stuck` after an ordinary completed restricted solve -> required.
- `contradiction` -> invalid puzzle/technique error, not required.
- Cancellation/deadline propagates through the existing generation control path.
- An internal deterministic floor-work cutoff -> unverified, never required.
- Uniqueness-dependent floor techniques run only after uniqueness has been established for the **same**
  model and givens. Add an explicit options/proof contract; a fourth parameter accepting only `budget`
  hides this important precondition.

Calling a solve with `budget:null` is not “one bounded solve” (`core/js/engine/logical-solver.js:94-103`). Use a dedicated
counter budget and account for floor solves separately from full ratings. A local cap must not be converted
to `report.solved !== true`. See Q-S02 for the cap and incomplete policy.

Tests:

- Actual classic9 Hard tier, scoped Killer tier, set union/disjointness at every global level, unsupported
  previous level, and the agreed VeryEasy special case.
- Known floor-solvable Normal constructed-1/3 and Nightmare constructed entries; known stuck Hard/Expert
  entries. Use `label`, never `entry.level`.
- A real shallow score-band case: current Normal seed 1 is sufficient. A hidden-quad-peak Hard fixture is
  a useful extra but not a prerequisite requiring a speculative fixture hunt.
- Empty/contradictory givens, a bounded cutoff, cancellation, and an unverified uniqueness precondition.
- Same puzzle after unrelated solves gives identical certificate/status; weights changed in a test do not
  leave stale cached tier sets.

### S0.2: soak columns

Add the requested technique histogram, band-position deciles and median without changing S0's exit
conditions. Preserve null/unrated/out-of-band outcomes as separate buckets, and record the histogram's
denominator. Hell 2 has no normalized finite-band position.

For a before/after comparison, shallow share must be over **solved in-band puzzles**, not over “exact”
puzzles after S1: exact will already imply required, making that metric identically zero. Report both
in-band and exact counts.

At S1 integration, the existing pipeline branch in `generator/tests/soak.js:226` must stop reconstructing exactness as
`rating.level===requested`. Use the same certified acceptance predicate, and extend invariant I5 to
check it. This is a necessary consumer correction, not a request to weaken the gate.

The initial approved baseline run belongs to the S0.2 developer before S1 changes output. Specify
`--count` or `--per-combo`: `--variant=classic9 --level=hard` alone generates the default 500 requests
(`generator/tests/soak.js:72-73`), not a 24-seed probe. Record raw counts, seed derivation, engine version and elapsed time.

### S1.1: certified exactness at every acceptance path

Recommended internal predicate:

```text
isExact(rating, requested) =
  rating.solved === true
  && rating.level === requested
  && rating.floor?.level === requested
  && rating.floor?.required === true
  && rating.floor?.ratingVersion === currentVersion
```

A vacuous certificate explicitly has required=true. A missing/stale/unknown certificate is never exact.
`ensureFloor` must be idempotent for a particular model/givens/requested-level/version, not merely for the
presence of any `rating.floor` property. A copied rating for changed signs/cages is not a cache hit.

#### Uniqueness and certification call-site audit

| Call site | Is `assumeUniqueness:true` justified? | Required implementation |
|---|---|---|
| `digLevelSteps` after `secureUniqueness` | Yes: `generator/js/engine/digger.js:919-936, 1223` independently counts and has a DFS fallback | Certify the checked `dug.model/dug.givens`, not the original model or a replaced prerating. |
| `createKeeper.offer` | Yes only **after** `countWithin===1` (`1054-1058`) | Certify before final distance calculation/storage; a cutoff is not unique. |
| `localSearchSteps` removal/swap/sign move | Yes after `uniqueWithin`; clue-only addition preserves uniqueness (`1441-1452`) | Certify `candModel/cand`; attach to the memoized rating only for that exact memo key/model. |
| `refineDown` | Yes when input came from a checked unique candidate and clues are only added | Carry that precondition; certify the final state, including early-return cases. Do not infer solver-path monotonicity from mathematical solution-set monotonicity. |
| Killer layout keeper offers | Keeper independently verifies; outside offers rely on non-uniqueness-assuming proofs or DFS (`generator/js/variants/killer.js:824-853, 907-916`) | Fix `keeper.closer`'s optimistic check too; do not certify a changed cage model using an earlier model's proof. |
| Greater-Than tuning offers | Keeper verifies; final `digLevelSteps` verifies the thinned model (`generator/js/variants/greater-than.js:396-408`) | Certificates bind to the exact sign set. |
| Soak baseline / standalone new API | Not automatically | Prove uniqueness with the existing I1 check first, or require the explicit verified caller contract. An imported puzzle or arbitrary grid cannot silently assume it. |

#### The keeper bug in the proposed insertion

At `generator/js/engine/digger.js:1051`, current code calculates distance and can return before the proposed certification.
If a shallow in-band rating is first stored with pre-certification distance 0, `keeper.distance===0`
terminates sampling and prevents another uncertified in-band candidate with precheck distance 0 from
being offered. Even if the stored distance is changed to 0.5 later, an upstream `closer` predicate can
discard equal-score candidates before their floor outcome is known.

Use an optimistic precheck only when its lower bound is strictly worse than the kept candidate. In-band
uncertified candidates must be allowed through while the best is shallow/unverified. After uniqueness and
certification, recompute distance and compare again. Never save a pre-certification distance. Test through
a bounded scripted strategy/keeper seam, rather than hoping six random seeds exercise this branch.

`distanceToLevel + 0.5` is adequate for the existing score gap scheme when applied **after** certification.
Give unverified in-band outcomes an explicit rank worse than certified required; distinguish them from
proved shallow results in warnings. All outer early-stop conditions must use certified exactness, not a
stale `keeper.distance===0`.

#### Local search, refine and objective shape

- Replace the below-minimum loop with `!isExact(...)`, but note there is **no local `level` variable** in
  `localSearchSteps`; use `spec.level`. The plan's literal replacement would throw a ReferenceError.
- Existing score-nondecrease acceptance can prevent leaving a high-scoring shallow state for a lower-
  scoring required state. Certification must at least let a required in-band result win through the keeper
  even if the local path does not adopt it. The optional target-based local objective is Q-S03.
- `refineDown` currently returns immediately for an in-band input and for sign models (`1106`), and
  `localSearchSteps` returns immediately after refining an above-band input (`1345-1352`). Ensure final
  certification still occurs and let a shallow refined result continue through the intended search route.
- Revealing a clue shrinks the mathematical solution set, but the greedy restricted solver is not proved
  monotone under reveal. Do not claim a floor certificate can be inferred for a new givens array.
- Make the guided objective a discriminated result, e.g.
  `{kind:'bounded', score, tierUsed}` or `{kind:'proposal', priority}`, with refusals distinct. Do not
  overload a negative number, a scored object and a proposal priority in the same unchecked comparator.

Warnings: retaining both `difficulty.approximate` and `difficulty.shallow` preserves current consumers.
`generator/tests/qualify.js:163-170` currently recognises the former, and `generator/js/ui/result-view.js:25, 157` uses it for retry UI.
The new `{level}` placeholder also requires passing a localized level argument in
`generator/js/ui/result-view.js:53-66`; adding translations alone leaves it unresolved. The warning choice is Q-S06.

Events: add `required` (and, if chosen, certificate status) to tune vocabulary and payloads, with tests for
true/false/null. `generator/js/engine/events.js` lists allowed keys rather than requiring every named argument. Raw dig log
structure can remain compatible; change help/explain text that equates tune success with score alone.

### S1.2: target-seeking guided dig

The independent `rng.fork('target')` draw is correct. It leaves the `random`/`guided` random streams
unchanged. Draw once per **sample**, and carry the value through guided dig, optional refine, local search
and explanatory events as needed. `first` returned by stage A has no report/score today
(`generator/js/engine/digger.js:443-447, 858-863`), so the suggested reuse is not already available.

#### Termination

The comparator does not create an endless loop if applied as intended:

- Each accepted move removes at least one present clue group.
- Each all-refused candidate pool marks at least one previously eligible group rejected.
- A non-improving pool stops.
- The clue floor and finite groups bound successful iterations; existing work caps bound other searches.

A test should instrument objective calls and accepted/rejected groups for equal-distance candidates,
all refusals, empty pool and min-clue boundary. Do not rely only on a wall-clock timeout.

#### Correct comparator and stop contract

For bounded score objectives, rank lexicographically by `(tierUsed, -abs(score-target))`, with a stable
tie rule inherited from the seeded candidate pool. Apply a candidate only if it improves that **same**
ordering, except for the explicitly permitted “both states have not yet used the tier, keep digging” phase.
The plan compares candidates tier-first but its final stop rule considers only distance; if the current
state uses a tier technique and all candidates lose it, a closer candidate can be accepted. That is not
the stated preference. `tierUsed` remains only a steering proxy, never a floor certificate.

Proposal mode needs its own rule. Its priority can be `1e9 + unsolvedCount` (`654-671`), not a rating.
For finite Nightmare/Hell 1 bands, distance from a target would favour **fewer** unsolved cells and can
stop the proposal prematurely. Keep proposal priorities maximized and outside finite-band distance
comparison. Certify/rate/refine the resulting unique candidate afterwards, as today.

Current-state evaluation must not call `guardedKeepsUnique` with an undefined group. For proposals,
reuse the known uniqueness proof and run only the proposal scoring part; for bounded dig, one guarded
logical objective solve is fine. Trace `keep` receives a number or null, never the scored object.

#### Attainability and acceptance expectations

With fixed weights and a required tier, a broad raw target does not create lower-band puzzles that cannot
exist under the estimator. At E=50, V=44.44:

| First newly admitted technique | Lower bound `1.25*w + V` | Band |
|---|---:|---|
| pointing, w=40 | 94.44 | Easy [45,180) |
| hiddenPair, w=145 | 225.69 | Normal [180,400) |
| xWing, w=320 | 444.44 | Hard [400,700) |
| xyWing, w=650 | 856.94 | Expert [700,1000) |
| nishioDeep, w=2600 | 3294.44 | Hell 1 [2400,3600) |

Actual totals can be higher because W includes all work. After weight-monotone ordering, the restricted
floor is a prefix of the full ladder, so a complete proof that gets past a stuck floor must use a later
technique. This explains the unavailable portions of bands; it is not a reason to reopen fixed weights.
Measure reachable positions, requested targets and deviations. “Median near 0.5” is not a universal
acceptance criterion. Six Hard seeds “not all in top quarter” is already true at HEAD and therefore does
not test the new behaviour.

Use a pure comparator/target seam and deterministic scripted objectives to test target selection. Keep a
small real seed regression as integration evidence, including exact+required and trace/cooperative parity.
Killer inherits the generic guided stage (`generator/js/variants/killer.js:1010-1018`) but may protect clues chosen by
its own layout search; target steering does not automatically govern that earlier search. Greater-Than
does not use the guided cell stage. Do not promise uniform target distribution across those variants.

### S2.1: order monotone with weight

The proposed 44/46/137 values are good. They preserve these documented tie outcomes:

- ineqChain outranks pointing at equal weight 40;
- nakedQuad outranks ruleOf45 at 260;
- jellyfish outranks cageSplit at 520.

Update source headers, `technique-weights`, fish registration assertions, manual Killer/Greater-Than
registration assertions, and the classic fixture registry expectation. The frozen fixture ladder is also
used by `before(id)`/`through(id)` to generate test states (`core/tests/fixtures/techniques.js:33-45`).
Simply moving jellyfish in that array changes existing fixtures' preprocessing.

Recommended fixture contract: keep explicit historical `after` arrays/legacy ladder for old snapshots,
and maintain a separate expected **current** registry list. New fixtures explicitly name their allowed
preprocessing sets. This preserves existing soundness evidence rather than silently remaking old positions.

The Player uses the same solver for hints, with a known-solution safety check
(`player/js/ui/play.js:694-760`). Reordering can invalidate generated examples even before adding IDs;
run the approved example-regeneration gate when needed, and both quick sets.

### S2.2: finer chain IDs

Current APIs already expose `i18nArgs.length` and `i18nArgs.chains` for chains, and `i18nArgs.depth` for
Nishio (`core/js/engine/tech-chain.js:353-385, 498-507`). There is no generic `links` property to search for.

Implement a shared search routine and ID-specific wrappers with:

- Explicit inclusive proof window.
- An effective maximum intersecting the caller's solver option.
- A shortest-proof rule, not “first proof of a convenient longer length”.
- Correct `Finding.technique` and correct explanation keys for the wrapper ID. Returning
  `technique:'forcingChain'` from `forcingChainLong.find` throws `solver.invalidFinding`.
- All three chain step subkeys (`endpoints`, `contradiction`, `forced`) and description keys in both
  applications/languages. A single `.step` string is insufficient.

The planned chain lengths should count graph edges; for two-path contradiction/forced findings, the
existing length is the maximum of the two path lengths (`core/tests/suites/tech-chain.test.js:124-154`).
Do not silently change it to the sum when splitting IDs.

For long/deep IDs, first exclude a shallower proof for the same search contract. Starting Nishio directly
at depth 2 would label a depth-1 contradiction “deep”. The existing increasing-depth scan supplies the
right basis, but `nishioDepth()` defaults to 2. Q-S04 must choose whether nishioDeep enables depth 3 by
default; that is new work, not merely renaming an existing default.

Existing option tests include 13-link/unlimited chains and default depth-2 Nishio
(`core/tests/suites/tech-chain.test.js:818-920`). Keep an internal general search seam for those algorithm tests, while public
IDs obey their windows; otherwise the proposed split contradicts existing API expectations. Document the
v3 behaviour of explicit `maxChainLength`/`maxNishioDepth` overrides.

Boundary tests: lengths 6/7/12/13; depths 1/2/3; a short proof present alongside a longer one; budget
interruption; invalid/off overrides; ID/key equality; soundness on generic units and partial-unit negatives.
Update generator family lists only as explicitly versioned v3 test data, not by changing the meaning of
historical certificates.

### S3: common acceptance contract for every new technique

All six groups are in scope. Every finder must:

1. Read, never mutate, the supplied state.
2. Return one deterministic, nonempty Finding; placements/eliminations are `[cellIndex,digit]`.
3. Use current candidates, true peer relationships and `completeUnits` where “digit must occur” is used.
4. Propagate cancellation and non-budget errors. A local exhausted search finds nothing; it never
   manufactures a contradiction or an elimination.
5. Include named positive patterns, negative near-misses, and an independent completion/soundness check.
6. Register weight, positive baseCost, scope, order, and all four locale packs together.

The plan omits baseCosts for new IDs. They do not set v2/v3 difficulty weights, but they enter the raw solver
score and `emptiesOf` reconstruction (`generator/js/engine/difficulty.js:373-382`). Choose and record them; do not leave
undefined values or copy a weight accidentally. Q-S08 covers a consistent convention.

Generic soundness is real, but not sufficient by itself. `core/tests/suites/techniques.test.js` requires
two positive fixtures and one negative per unscoped technique, checks the exact registry list and the set of
uniqueness-dependent IDs, and requires positive firing counts in a random sweep. New rare patterns may
not appear in that existing corpus. Add independently checked deterministic states to its corpus instead
of weakening the firing assertion or relying on a vacuous sweep.

#### Group 1: skyscraper, two-string kite, empty rectangle

File: `core/js/engine/tech-fish.js`; reuse owner-line/unit/peer infrastructure at `56-125`, not raw
`row * 9 + column` arithmetic.

| Technique | Implementable sound contract |
|---|---|
| skyscraper | Choose two disjoint complete parallel lines with exactly two current candidates for digit d each. One pair of endpoints shares an orthogonal line; the other two endpoints differ. The shared endpoints cannot both be d, so at least one other endpoint is d. Eliminate d from external candidates seeing both other endpoints. |
| twoStringKite | Choose a complete row conjugate pair and complete column conjugate pair with four distinct cells. One endpoint of each lies in the same box and the two are peers; the remaining endpoints therefore cannot both be false. Eliminate d from candidates seeing both remaining endpoints. |
| emptyRectangle | A complete box's candidates for d lie on one row arm and one column arm, with the arms disjoint and nonempty and their intersection not a candidate. They form an XOR group pair. Link one arm, through an external conjugate pair, to a singleton endpoint; eliminate only from candidates seeing every occurrence in the other arm and that endpoint. Enumerate the transposed pattern too. |

For the empty rectangle, the grouped proof can be implemented directly without waiting for S3 group 4.
Reject three-line boxes, a candidate at the “empty” intersection for this restricted form, incomplete units,
overlapping endpoints and targets not seeing the entire grouped arm. Broader empty-rectangle variants
need explicit proofs, not a relaxed `unitMeta.kind==='box'` check alone.

Add at least two positives per ID, mirrored/transposed forms, a no-box board, partial-row/box negatives,
and overlapping-grid ownership negatives. Existing fish skips ambiguous line owners on multigrids
(`core/js/engine/tech-fish.js:19-23, 56-75`); preserve that safety rather than assuming ordinary coordinates.

#### Group 2: finned X-Wing and finned Swordfish

A sound shared finned-fish condition:

- Pick n disjoint complete base lines and n cover lines.
- Every base candidate outside those cover lines is a fin.
- Fins are nonempty and all lie in one box.
- An elimination target is outside the base lines, on a selected cover line, and sees **every** fin.

If no fin is true, the ordinary n-fish argument fills the n covers; if a fin is true, the target cannot be
the digit. That proves the elimination in both cases. This also permits sashimi cases when an apparent
corner is missing; do not require a complete rectangular skeleton to satisfy the plan's sashimi promise.
Avoid a global cell bit mask in one JavaScript number: boards can exceed 32 cells/lines.

Extend `findFish` carefully or add a shared helper; preserve the current n=2/3/4 ordinary-fish results.
Tests: ordinary fin, multiple fins in one box, sashimi, transposed forms, off-cover target, one fin outside
the common box, target not seeing every fin, and overlapping/partial units. Keep all loop branches bounded
and budget-checked.

#### Group 3: remote pairs, WXYZ-Wing, rectangle extensions, BUG+1

File: `core/js/engine/tech-wing.js`; existing peer matrix and bivalue scan at `62-105` are reusable.

- **Remote pairs:** group bivalue cells by identical two-digit mask; peer edges enforce alternating
  assignments. Two-colour each consistent component. A cell seeing both colours loses both digits.
  “Odd chain” means an odd number of edges, not an odd number of cells; require a nontrivial remote
  connection rather than relabelling a two-cell naked pair. A three-cell path does not make its endpoints
  opposite. Reject inconsistent odd-cycle colouring; include the even-edge negative fixture.
- **WXYZ-Wing:** four open cells whose candidate union has four digits. For each digit other than z,
  all its occurrences in the four cells must be mutually visible (at most one can be true). z is the
  single non-restricted digit. If z were absent, four cells would need three digits each usable at most
  once: impossible. Eliminate z from an external cell seeing all z occurrences. This is a precise
  implementation of the stated non-restricted-candidate rule. Test two non-restricted digits and a missed
  z occurrence as negatives. Bound four-cell enumeration; do not scan all quadruples on Samurai.
- **UR types 3/4/hidden:** keep `isDeadlyGeometry`/`buildRectangles` guards
  (`core/js/engine/tech-wing.js:349-399`). Cages/inequalities exclude UR because the digit swap need not preserve them.
  Every extra unit touching the four corners must preserve the swap, not only rows/columns/boxes.
  Type 3 treats the roofs' non-pair candidates as a virtual subset member in a shared unit; combine it
  with a compatible real subset before eliminating. Type 4 requires a genuine conjugate link for one
  deadly digit between roofs, then removes the other deadly digit from both roofs.
  A sound hidden form: one corner is exactly `{x,y}`; at the opposite corner, the row and column each
  have a conjugate link on x to the adjacent rectangle corners. That opposite corner cannot be y,
  because it would force the entire deadly rectangle. Include transposes and swap x/y.
- **BUG+1:** do not implement only “one trivalue cell, digit appears three times nearby”. Require every
  other open cell bivalue and the global BUG occurrence invariant: after deleting the proposed extra
  digit from the trivalue cell, every unplaced digit in every relevant complete unit has exactly two
  occurrences. With no cages/inequalities/unsupported partial constraints, the remaining Boolean
  two-choice structure would admit a solution flip, contradicting uniqueness. Thus place the extra digit.
  Mark `assumesUniqueness:true`, honour the context flag, and reject models where that flip would not
  preserve all constraints.

Rectangle subtypes retain the same weight/ID as directed, but add separate subtype step keys and tests.
BUG adds a second uniqueness-dependent technique, so the shared registry test's singleton expectation
must change. Use unique-puzzle fixtures for uniqueness rules; a merely known completion is not enough to
justify a uniqueness assumption.

#### Group 4: XY-chain and grouped forcing chains

“Cell links only” is ambiguous. If it means no inter-cell edges, no XY-chain is possible.
Specify:

```text
XY-chain strong edges: the two candidates inside a bivalue cell.
XY-chain weak edges: equal-digit candidates in distinct peer cells.
Endpoints: equal digit, distinct cells; a false-to-true alternating path proves at least one endpoint true.
```

Do not use conjugate-unit strong edges or general multivalue cell edges in this restricted finder.
Choose deterministic shortest paths within the agreed length cap; return ID `xyChain`, with its own
explanation keys. Include a same-digit endpoint requirement and a negative chain using a trivalue cell.

Grouped links need a larger change than the plan implies. Today node IDs are arithmetically decoded as
`cell * digits + digit`, buffers size to `cellCount*digits`, strong-pair capacity is
`cellCount + unitCount*digits`, and `pathData` returns singleton triples (`core/js/engine/tech-chain.js:78-112, 353-360`).

Recommended graph contract:

```text
Node = { digit, cells: sorted unique cell[] }    // truth = at least one occurrence in this group is true
```

Singleton candidates are one-cell nodes. Group nodes are nonempty current box-line intersections.
A same-digit weak group edge is valid only when the groups are disjoint and **every** cross-pair conflicts.
A same-digit strong edge is valid only when disjoint nodes exhaust the current occurrences of the digit in
a complete unit. Retain the existing different-digit singleton weak links inside one cell and bivalue-cell
strong links. Do not treat overlapping groups as independent literals or require only one cross-peer pair.

Keep stable canonical node IDs/order, bounded dynamically sized graph buffers, and typed proof nodes
in `i18nArgs` (version the representation if necessary). Update the chain proof checker in
`core/tests/suites/tech-chain.test.js:124-185`, `player/js/ui/play.js:226-245` (`localizeArgs`),
`player/js/ui/i18n.js:240-246` and `generator/js/ui/i18n.js:252-258` (`formatChains`). These consumers
currently assume singleton triples. Preserve digit display for Wordoku and hexadecimal boards, and
highlight every member of a group. Test singleton/group mixed paths, full-group visibility, overlapping
groups, partial units, cancellation and state immutability.

A finite 12-link graph search is not complete for every 3D Medusa/AIC elimination. The plan's statement
that existing chains already prove **all** such eliminations is too strong. Document these as “no separate
ID; some represented deductions may be found within the bounded chain search”, not as full coverage.
Depth-limited Nishio likewise does not guarantee every omitted ALS/fish pattern.

#### Group 5: law of leftovers and Killer interaction audit

**Law of leftovers:** scope `['jigsaw9']`, group `locked`, order 87, weight 200. Select n disjoint complete
rows (or columns) and n disjoint complete regions. Their digit multisets each contain n copies of every
digit; subtract the common cells. The two difference sets must have the **same multiset**, not merely the
same set of digits. Account for fixed values on each side.

A bounded implementable finder can precompute qualifying unit unions with small symmetric differences,
enumerate candidate-consistent assignments on each side (respecting within-side peer conflicts), and
intersect their digit-multiset signatures. Remove a candidate only when no matching signature supports
it. This is an over-approximation of full-grid completions, hence safe. Fix maximum selected units,
difference size and work budget before implementation (Q-S05); count equality alone does not choose
which cells receive which digits. Tests: one-cell equality, multi-cell repeated-digit multiset, givens on
one side, row/column duals, wrong region count, overlap/partial units, and non-Jigsaw scope.

**Killer:** both ordinary patterns asked for already exist.

- `pointOutOfCage` removes every always-needed cage digit from other cells in a common unit
  (`core/js/engine/tech-cage.js:118-139, 173-191`).
- For a two-cell sum-3 cage, surviving set `{1,2}` removes both digits from the rest of its row/box.
  `generator/tests/manual/killer.test.js:559-574` already tests that exact killer-pair case.

An independent tiny probe of that cage returned `cageCombo`, forced digits `[1,2]`, 26 eliminations
outside the cage, including `[R1C3,1]` and `[R1C3,2]`. No new `cageLocked` ID is needed for the plan's
ordinary examples. Add focused quick coverage of the audited behaviour. If the owner means a stronger
assignment-derived pair within a larger cage, that is a different, currently unspecified pattern (Q-S09).

#### Group 6: ALS-XZ and Sue de Coq

New `core/js/engine/tech-als.js`; add all source/suite lists. The registry has no `als` group today
(`core/js/engine/techniques.js:85`), and the plan leaves group/baseCost unspecified. Prefer existing group `chain` for
both unless the owner explicitly wants a new help category; see Q-S08.

**ALS enumerator:** select k open cells within an all-different unit with exactly k+1 digits in their
candidate union. Deduplicate identical cell sets across units. A complete-unit requirement is unnecessary
for this at-most-once argument, but all cells must genuinely be pairwise constrained. Use deterministic
cell order and explicit size/work limits. Cache only immutable model geometry; candidate-dependent ALS
lists must be recomputed or keyed by the exact state, not by mutable state-object identity alone.

**ALS-XZ:** choose disjoint ALS A/B and a restricted common candidate x: every occurrence of x in A
sees every occurrence in B. For another common candidate z, at least one z occurs in A or B. Otherwise
both ALSs would have to use x, impossible. Eliminate z only from external candidates seeing every z
occurrence in both sets. Negative tests: overlapping ALSs, one non-seeing x cross-pair, a missing z
visibility, and union cardinality not k+1.

**Sue de Coq:** use a precise count proof, not an informal invocation of the ALS helper. One conservative
general form is:

- I: two or three cells in a line/box intersection.
- A: an ALS of p cells in that line outside the box.
- B: an ALS of q cells in that box outside the line.
- A/B digit sets are disjoint, both subsets of I's candidate union C.
- `|C| = |I| + p + q`; let Z be C minus the two ALS digit sets.

A allows at most one I cell to use an A digit; B allows at most one I cell to use a B digit. Since
`|Z|=|I|-2`, all those capacities must be filled. Therefore all A digits are used among A plus I in the
line, all B digits among B plus I in the box, and each Z digit occurs in I. Eliminate A digits elsewhere
on the line, B digits elsewhere in the box, and Z digits elsewhere in either unit. This supplies a direct
soundness argument and covers the ordinary two-cell/two-bivalue example.

Test a two-cell intersection, a three-cell intersection with Z, overlapping digit sets, the wrong cardinality,
wrong unit membership, multiple z occurrences, and variant shapes. Agree the bounded catalogue and limits
in Q-S05. A finder that silently searches every ALS pair on a 369-cell board is not feasible for every
dig objective call.

### S2.3: version, cache, history and release integration

Ship S1, S2 and all S3 together as rating v3; do not deploy the changed exactness rule with schema-2 cached
puzzles still treated as current results. Internal commits can remain separated, but the release is atomic.

Required edits:

- `generator/js/engine/difficulty.js:58`: rating version 3 and type comments.
- `generator/js/ui/cache.js:47`: schema version 3; verify v2 purge, v3 floor retention and cache-regeneration
  equality semantics. Do not change generic injected-version unit tests from 1/2 to 2/3 unnecessarily.
- Manual version assertions and explicit current-version tests; keep importer/progress fixtures for old
  positive version 2 as compatibility tests. `generator/tests/suites/replay.test.js:1601` can intentionally remain a legacy/stub
  example unless its purpose becomes current-version output.
- Exports continue writing ratingVersion. Decide whether floor evidence is exported or remains Generator-
  internal (Q-S07). Current exporter/importer do not round-trip it.
- History contains neither full puzzle nor ratingVersion. The proposed “rated with v2” marker cannot
  truthfully be added only in `generator/js/ui/result-view.js`; adding versioned summary metadata requires
  `generator/js/ui/history.js`, migration/default wording and history tests. Missing version should mean “earlier/unknown
  version”, not automatically v2.
- New notes, before/after tables, qualification report and `docs/README.md` link; update live help/design/
  guide facts, including the final technique count. With no duplicate `cageLocked`, the final count is
  **40** (26 existing + 2 split IDs + 12 S3 additions), of which 34 are unscoped classic techniques.
  Adding a distinct cageLocked makes 41.

The current notes/probe requirements should record floor-required distributions, not just score and peak
histograms, because adding cheaper techniques legitimately changes classifications and exact-hit rates.

## 5. Open decisions and recommendations

### 5.1 Implementer-level corrections

These are necessary to fulfil the fixed requirements, not requests to change them:

- Use `label` in rated fixtures, `killer` as the variant ID, and the actual global test harness.
- Keep set derivation independent of offered-level gaps; explicitly handle the no-predecessor case.
- Treat contradiction/cutoff/missing certificate as not certified; never make them exact.
- Recompute keeper ranking after certification and fix upstream optimistic prechecks.
- Use `spec.level` inside local search; its function has no `level` local.
- Keep proposal priority separate from bounded score distance.
- Preserve the current uniqueness proof ordering at every call site and bind memo data to the real model.
- Add `result-view` warning arguments and the pipeline/soak exactness consumer correction.
- Preserve historical fixture preprocessing sets while adding a current registry expectation.
- Return the correct new Finding IDs and real subtype locale keys.
- Keep rectangle/BUG variant guards and complete-unit conditions sound.
- Audit Killer's existing interactions without adding a duplicate ID for the demonstrated cases.
- Add all eight source lists and both core suite lists for ALS.
- Add a real golden-analysis recorder/checker; the existing wire updater is not one.
- Publish new v3 qualification evidence rather than overwriting dated v2 reports; update consumers' links.
- Reset or localise operation-spacing counters where new deterministic caps depend on them:
  `core/js/engine/tech-subset.js:48, 136` currently keeps `nodes` across calls. Additional floor solves
  otherwise shift later guard boundaries by call history. This tightly coupled determinism issue should
  be tested before adding another cap based on `ctx.check()` counts.

### 5.2 Owner questions

All recommendations remain unadopted. The full technique catalogue, required-tier rule, one-step sufficiency
and gate permission are not open questions.

| ID | Question and options | Recommendation | Consequences |
|---|---|---|---|
| Q-S01 | VeryEasy contract: (a) actual singles tier with explicit vacuous certificate; (b) empty displayed tier with a documented exception to set difference/union; (c) define its floor as its own allowed set. | a | a keeps algebra/test invariants; b has two different tier meanings; c changes the vocabulary's empty-floor definition. |
| Q-S02 | Floor work limit and unknown outcome: (a) deterministic local cap, unverified never exact; (b) only inherited cancellation/deadline budget; (c) retry with a larger deterministic cap before rejecting. | a, calibrate the cap from bounded samples | a has predictable worst-case work but may lower hit rate; b can be very slow without a caller budget and is timing-sensitive; c costs more and needs a fixed two-stage policy. |
| Q-S03 | Target semantics beyond the guided stage: (a) uniform raw-band target, tier-preserving comparator, keep existing refine/local objectives; (b) carry the same target into refine and local search while preserving required; (c) target only an empirically attainable subrange. | b, report unattainable target regions rather than changing weights | a leaves a strong top-edge fallback bias; b gives a coherent sample objective but changes more output; c changes the target distribution and requires data-defined bounds. |
| Q-S04 | New chain windows and depth defaults: (a) short<=6/long7..12; nishio depth1/deep2..3 with default3 for deep; (b) same IDs but deep defaults to2 and depth3 only explicit; (c) separately weight depth3. | b initially for bounded cost; measure before enabling 3 | a implements the broad draft window automatically but may multiply generation time; b preserves the old default maximum but needs honest documentation; c expands the ID/weight design beyond the plan. Also confirm public override behaviour. |
| Q-S05 | Bounded coverage of expensive new patterns: (a) explicitly documented limits, e.g. ALS size<=4 and small leftovers differences, with deterministic work guards; (b) exhaustive catalogue enumeration at every call; (c) size-dependent limits by board. | a with common constants chosen by evidence | a is feasible but not logically complete for every named pattern; b risks unusable dig/hint latency; c creates board-dependent technique capability that must enter model/version documentation. Full scope means implementing all names, not unbounded searches. |
| Q-S06 | Shallow warnings: (a) keep approximate and add shallow; (b) replace approximate with shallow; (c) one structured warning with a new API. | a | a preserves qualification/retry consumers; b needs every existing approximate consumer updated; c adds a larger serialization/UI change. |
| Q-S07 | Persist/export floor evidence and legacy-version marker: (a) retain floor in v3 cache/wire only; add truthful current/unknown history-version note; (b) also export/import certificate metadata; (c) no marker and no new external fields. | a | a keeps Player exchange stable and explains regeneration; b adds another claim-validation surface; c is smallest but hides why an old entry's regenerated level changes. |
| Q-S08 | New IDs' raw baseCosts and ALS group: (a) positive `weight/10` costs for new IDs, existing costs untouched; ALS in `chain`; (b) hand-picked raw costs; (c) add a new `als` registry/help group. | a | a is predictable and keeps calibrated weights separate; b needs another table; c touches registry validation, group ordering, help and certificates. Raw costs are not the v3 weights. |
| Q-S09 | Does group 5 mean the ordinary killer-pair already implemented, or a stronger hidden assignment pattern? (a) existing cageCombo + explicit quick regression; (b) add assignment-derived pair pruning within larger cages; (c) split existing effects into cageLocked. | a | a fulfils the demonstrated ordinary patterns with no duplicate ID; b needs a precise matching/support algorithm and fixtures; c changes attribution/weights for behaviour already present. |
| Q-S10 | Reference-puzzle labels versus new cheaper techniques: (a) retain v2 labels/certificates as historical and add v3 expectations; (b) constrain new-ID priors within approved ranges to keep selected benchmark labels; (c) defer release pending a separate calibration decision. | a | a accepts the plan's intended downward reclassification; b can conflict with accurately naming easier proofs; c delays delivery. Existing weights and bands are not changed without the separately required decision. |
| Q-S11 | Help-example acquisition: (a) deterministic curated source puzzles plus bounded regeneration/checking per new ID; (b) run the current large stochastic search until every ID appears; (c) allow a distinct synthetic candidate-state example format. | a | a preserves real hint-replay examples but requires fixture discovery work; b is unbounded in practice and may never find rare IDs; c is a user-visible help contract change and needs a new soundness/replay verifier, not silent test removal. |

The proposed optional test of certified-versus-shallow selection should not remain optional: it directly
guards the keeper bug. Making that regression mandatory is an implementation-quality correction, not a
product choice. The optional “refine toward target” and history marker are covered by Q-S03/Q-S07.

## 6. Proposed task breakdown and approved gates

### 6.1 Ownership and execution model

Use one developer in this repository at a time. Shared weight tables, fixture registries, four locale packs,
help examples and docs make most superficially separate technique groups **not file-disjoint**.
The table gives exclusive ownership for the duration of a task; overlapping files transfer only after
the preceding task is complete. These tasks must not be run concurrently in one checkout.

“Integration bundle” below is explicit shorthand for:

```text
generator/js/engine/difficulty.js
core/tests/fixtures/techniques.js
core/tests/suites/techniques.test.js
generator/tests/suites/technique-weights.test.js
generator/tests/fixtures/rated.js
generator/js/ui/locale.en.js, generator/js/ui/locale.vi.js
player/js/ui/locale.en.js, player/js/ui/locale.vi.js
generator/js/ui/help.js, player/js/ui/help.js
generator/tests/suites/help.test.js, player/tests/suites/help.test.js
player/js/ui/help-examples.js and its approved recorder inputs
generator/design.md, player/design.md
USERGUIDE.md, USERGUIDE.vn.md, DEVELOPERGUIDE.md, DEVELOPERGUIDE.vn.md
```

Only edit the bundle members whose facts actually change. This is a file-ownership list, not permission
to rewrite unrelated help/fixtures. All new code stays classic-script/IIFE; no architecture refactor.

| ID | Title / bounded scope | Depends on | Exclusive files while active | Size | Gates owned |
|---|---|---|---|---|---|
| SV3-01 | Tier algebra, certificate contract, floor solver and focused tests; S0.1 | Q-S01/Q-S02 | `generator/js/engine/difficulty.js`, new `generator/tests/suites/difficulty-floor.test.js`, `generator/tests.html`, paired developer docs/design | Medium-Large | Generator quick; Player quick if core counter reset is included |
| SV3-02 | Before/after calibration columns and v2 baseline; S0.2 | SV3-01 | `generator/tests/soak.js`, new v3 baseline record | Medium | GS-BEFORE |
| SV3-03 | Certified exactness throughout samples/keeper/local/refine/variants/events/warnings; S1.1 | SV3-02, Q-S06 | `generator/js/engine/digger.js`, `generator/js/engine/events.js`, result-view/locales, pipeline/soak exactness path, digger/floor/events/result-view tests, variant call sites as required | Large | Generator quick; positive/negative acceptance regressions |
| SV3-04 | Target comparator, proposal separation and agreed refine/local policy; S1.2 | SV3-03, Q-S03 | `generator/js/engine/digger.js`, help/explain text, digger/floor/replay tests, v3 probe record | Large | GG-S1, GR-S1, GQ-S1, GD-S1 |
| SV3-05 | Weight-monotone order and historical/current fixture split; S2.1 | SV3-04 | `core/js/engine/tech-cage.js`, `core/js/engine/tech-ineq.js`, `core/js/engine/tech-fish.js`, pinned core/manual tests, fixture ladder and integration bundle | Medium-Large | Both quick; GH if examples change; GG/GR checkpoints |
| SV3-06 | Chain windows, long/deep IDs and deterministic cap counters; S2.2 | SV3-05, Q-S04/Q-S08 | `core/js/engine/tech-chain.js`, `core/js/engine/tech-subset.js` counter fix if needed, chain tests, integration bundle | Large | Both quick; GH mandatory for new IDs; GG/GR |
| SV3-07 | Skyscraper and two-string kite; S3 group 1a | SV3-06 | `core/js/engine/tech-fish.js`, fish tests, integration bundle | Medium-Large | Both quick; GH, GG/GR |
| SV3-08 | Empty rectangle direct grouped proof; S3 group 1b | SV3-07, agreed pattern scope | `core/js/engine/tech-fish.js`, fish tests, integration bundle | Medium | Both quick; GH, GG/GR |
| SV3-09 | Finned X-Wing/Swordfish including sashimi; S3 group 2 | SV3-08 | `core/js/engine/tech-fish.js`, fish tests, integration bundle | Large | Both quick; GH, GG/GR |
| SV3-10 | Remote pairs and WXYZ-Wing; S3 group 3a | SV3-09, Q-S05 | `core/js/engine/tech-wing.js`, wing tests, integration bundle | Large | Both quick; GH, GG/GR |
| SV3-11 | UR type 3/4/hidden and guarded BUG+1; S3 group 3b | SV3-10 | `core/js/engine/tech-wing.js`, wing/registry tests, integration bundle | Large | Both quick; GH, GG/GR |
| SV3-12 | Restricted XY-chain; S3 group 4a | SV3-11 | `core/js/engine/tech-chain.js`, chain tests/proof checker, integration bundle | Medium-Large | Both quick; GH, GG/GR |
| SV3-13 | Group-node graph, proofs and bounded grouped chain search; S3 group 4b | SV3-12, Q-S05 | `core/js/engine/tech-chain.js`, chain fixtures/proof checker, `generator/js/ui/i18n.js`, `player/js/ui/i18n.js`, `player/js/ui/play.js` and relevant locales/tests | Large; split graph and integration if >1,600 lines | Both quick; GH refresh, GG/GR |
| SV3-14 | Law of leftovers and existing Killer-interaction quick coverage; S3 group 5 | SV3-13, Q-S05/Q-S09 | `core/js/engine/tech-subset.js` or `core/js/engine/tech-basic.js` (choose one owner, recommend subset), subset/basic tests, new focused core cage test if needed, integration bundle | Large | Both quick; GH; GD variant tests; GG/GR |
| SV3-15 | ALS enumerator and ALS-XZ; S3 group 6a | SV3-14, Q-S05/Q-S08 | New `core/js/engine/tech-als.js`, new `core/tests/suites/tech-als.test.js`, eight source lists/two suite lists, integration bundle | Large | Both quick; GH; GG/GR |
| SV3-16 | Sue de Coq and long-chain order 198; S3 group 6b | SV3-15 | `core/js/engine/tech-als.js`, ALS tests, `core/js/engine/tech-chain.js` final order, integration bundle | Large | Both quick; GH; GG/GR |
| SV3-17 | Final version/cache/history/export integration; S2.3 | SV3-16, Q-S07/Q-S10 | `generator/js/engine/difficulty.js`, cache/history/export as agreed, pinned version tests, live docs, new notes and docs index | Medium-Large | Final GG, GR, GH; both quick |
| SV3-18 | Final v3 qualification/performance/soak and offered-list evidence | SV3-17 | `generator/tests/soak.js`, `generator/tests/perf.js`, `generator/tests/qualify.js` only required v3 checks; regression/replay records; variant support lists; cache COSTS if recalibrated; new v3 reports and living documentation | Medium-Large excluding generated data | GS-AFTER, GP, GQ-FINAL, GD-FINAL, final both quick |

Sizes include tests/docs: Medium approximately 300-800 lines, Large 800-1,600. Several combined original
steps exceed Large and are split above. The plan's “one commit per S3 group” should mean a coherent
verified group, not a reason to put a several-thousand-line grouped-graph/fixture change into an undersized
developer task.

```text
Owner contracts -> 01 -> 02 -> 03 -> 04 -> 05 -> 06
  -> 07 -> 08 -> 09 -> 10 -> 11 -> 12 -> 13 -> 14 -> 15 -> 16 -> 17 -> 18
```

Some arrows are ownership/integration sequencing rather than mathematical prerequisites: fish, wings,
leftovers and ALS are conceptually independent, but their registrations/locales/fixture bundles are not.
Do not start multiple developers on them unless an integration owner is explicitly assigned and unregistered
module work is isolated. The Pentomino task chain is genuinely independent and can run alongside this one.

### 6.2 Approved gate ledger

All gates below are already authorised for their named developer task. They are **not** requests to the
owner for run permission. Record command, source version, Node version, sample count, elapsed time, exit
status and every resulting intentional fixture change.

| Gate | Command / evidence | Task assignment |
|---|---|---|
| Routine | From generator: `node tests\node-runner.js`; after core changes also from player: same command | Every relevant task; targeted selectors first, then the required quick sets |
| GS-BEFORE | `node tests\soak.js --variant=classic9 --level=normal,hard,expert --count=48`, with new columns; bounded additional variant samples if needed | SV3-02, before output changes; `docs/difficulty-v3/baseline.md` |
| GG | From generator: `node tests\perf.js --update-hashes`, then `--check-hashes` | SV3-04 after S1; every later task that intentionally changes generated output; final SV3-17/18 verification. Do not update without examining the cause. |
| GR | `node tests\replay-fixtures.js`, then `--check`; additionally regenerate/verify the 14 `generator/tests/fixtures/replay-goldens.js` analyses with a dedicated bounded recorder | SV3-04 must supply the missing analysis-recording route; later output/solver-changing tasks own necessary refreshes |
| GQ-S1 | `node tests\qualify.js --variant=<id> --level=<ids> --jobs=1 --json=<new-v3-file> --markdown=<new-v3-file>` in bounded batches | SV3-04; compare to the dated v2 qualification, do not overwrite it |
| GD-S1 | From generator: `node tests\node-runner.js --suite=difficulty`; separately `--suite=killer,greater-than` as needed | SV3-04; these are manual suites despite selector syntax |
| GH | From player: `node tests\tools\make-technique-examples.js ..\generator`, using the approved bounded/curated route established for new IDs; then Player help/quick checks | SV3-05 if ordering invalidates examples; SV3-06 onward for every new ID; final SV3-17 |
| GP | From generator: `node tests\perf.js --variant=<id> --level=<ids> --runs=50 --gate` in bounded shards | SV3-18; p50/p95/max, not merely hash regeneration. `--update-hashes` exits without measuring the p95 gate. |
| GS-AFTER | Soak with the same baseline configurations plus all final offered pairs in bounded batches; certified exactness/I5 checked | SV3-18; required, shallow, unknown and band-position distributions |
| GQ-FINAL | Full offered-level qualification, divided by variant/level; fixed 40/100-seed protocol retained | SV3-18; update support lists and living links from new v3 evidence |
| GD-FINAL | Manual `difficulty` selector and affected variant selectors already named by the plan, correctly identified as manual rather than quick; no blanket `--all` run is assumed authorised | SV3-18; no weakening of historical soundness or performance assertions |

New-example generation needs engineering before repeated gate use. The current tool's default plan can
generate thousands of puzzles (`player/tests/tools/make-technique-examples.js:28-39`); `--puzzles=N`
only truncates **stage 2**, after stage 1 generated the whole corpus (`252-259`). It uses a temporary file
and writes LF output (`245-259`). Adapt it to explicit project-relative artifacts, bounded selected source
puzzles/IDs, deterministic output and repository line-ending conventions before using it under the task
environment's constraints. Do not assume a `--puzzles` flag bounds its generation cost.

Every test/probe invocation must obey the ten-minute ceiling; browser checks, if later added to a gate,
obey the repository's allowed execution policy. Split performance/qualification work into complete,
documented shards instead of abandoning outcomes or reporting a partial sample as qualified.
No step should leave quick tests red waiting for permission that has already been granted.

## 7. Risks

| Risk | Severity | Required mitigation |
|---|---|---|
| False required certificate from missing proof, contradiction or timeout | Critical | Three-way/explicit status; uniqueness contract; strict exact predicate; negative acceptance tests. |
| Unsound new technique | Critical | Formal preconditions, independent tiny/completion oracle, negative patterns, all-variant geometry guards; keep Player solution checks as a final defence, not the proof. |
| Keeper early exit returns shallow result as exact | Critical | Certification before final ranking; fix `closer`, stored distance and all early stops; scripted regression. |
| Fixed-weight tiers make some offered levels difficult to generate | High | Record attainability and unknown/shallow misses; requalify every affected offered pair, especially small boards and Hell 1. |
| Grouped graph or ALS enumeration dominates every objective call | High | Bounded data structures/search limits, local deterministic counters, cancellation checks inside inner loops, per-board p95 gate. |
| Extra floor solves change cap boundaries by process history | High | Localise `tech-subset` operation-spacing state and test warm-worker/interleaved-solve determinism. |
| New technique lacks real Player example or positive generic fixture | High | Build the curated fixture/recorder path early; preserve non-vacuous checks; budget discovery work explicitly. |
| “Update replay fixtures” leaves golden analysis expectations stale | High | Separate wire snapshots from 14 expected analyses; verified regeneration of both. |
| Duplicate/frozen historical certificate edits hide intended reclassification | High | Keep v2 metadata immutable; separate v3 expectations and report changes. |
| Old cache/history or pipeline consumer bypasses certified exactness | High | Atomic release, schema purge, pipeline/soak/qualification tests, truthful legacy wording. |

The new lower-tier rule is operational: “this deterministic restricted solver gets stuck”, not a proof that
no person can solve it by any lower-tier sequence. Monotone weights make the full ladder a useful prefix
extension but do not establish completeness of individual pattern finders. State this plainly in the
design and UI explanations.

## 8. Effort estimate

After owner answers, with one implementing developer and full scope:

| Work | Engineering effort |
|---|---:|
| Floor certification, exactness consumers, target steering and instrumentation | 20-30 hours |
| Order/windows and simple fish/remote patterns | 18-28 hours |
| WXYZ/UR/BUG, XY/grouped graph, leftovers and ALS/Sue de Coq | 42-65 hours |
| Shared fixtures, real help examples, replay goldens, locale/docs integration | 22-36 hours |
| Approved qualification/performance runs and fixes from their results | 16-28 hours |
| **Total** | **118-187 hours, roughly 15-24 developer days** |

The largest risks to the estimate are grouped proof representation, new real hint examples, and expensive
variant qualification. This is substantially more than six “one-commit technique” patches. A Sonnet
developer can execute precise bounded packs, but elapsed agent time is not reliably predicted from model
name or changed-line count. Run this repository alongside Pentomino; keep each repository's integration
and validation serial unless file ownership is explicitly separated.
