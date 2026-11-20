# Rating v3 plan: independent analysis (SA1, claude-opus-5.5)

Status: analysis report, 2026-11-12, of `docs/difficulty-v3/plan.md` against the code at HEAD `6abcb9f` (branch
`rating-v3`). Read-only: no file of the repository was changed except this report. Probe scripts and outputs stayed
outside the repository. Paths are relative to the repository root.

Owner decisions received during the analysis and applied here: the scope is the full plan (S0 to S3, all six S3
groups, and S2.3); every APPROVAL GATE run named by the plan is pre-approved and is assigned to the task that needs it
(§6); every new design decision is listed as an Owner question (§5.2) and is not treated as adopted.

---

## 0. Summary and verdict

The plan is accurate where it describes the code: the probe reproduces to the point, the tier table is exactly what
`spec()` derives from today's weights, every digger anchor is right, and the proposed order numbers satisfy the
S2.1 invariant together with S2.2 and S3. `certifyFloor` with `assumeUniqueness: true` is sound at every call site.
The S1.2 comparator terminates. The plan is executable, but measurements at HEAD change its picture of *where* the
"required" rule bites, and it misses several test and fixture obligations that will stop a developer.

Top issues (details in §2 and §4):

1. **"Required" mostly changes other levels than classic9 Hard.** Floor solves of the generator's output at HEAD:
   classic9 Hard 0/24 shallow, Expert 0/12, but Normal 5/12, Master 4/12, **Nightmare 12/12**; Killer Hard 6/6 and
   Killer Expert 6/6; jigsaw9 Expert 4/6; Greater-Than Hard 2/6. For classic9 Hard, what changes the puzzles is S1.2
   (band target) and S3 (more Hard techniques), not S1.1.
2. **Nightmare and Hell 1 may become unreachable.** All 12 sampled Nightmare puzzles peak at `forcingChain` (a Master
   technique) with chains of 3-6 links. With the S2.2 window (`forcingChain` <= 6 links, `forcingChainLong` 7-12) all
   12 stay shallow: Nightmare would need a 7+ link chain or Nishio, Hell 1 a depth-2 Nishio (Q-S1, Q-S5).
3. **Easy changes meaning.** Today an Easy puzzle can be singles-only: the empty-cell term V (about 42 at 44 empty
   cells) plus a few points of singles reaches 45; all three constructed Easy fixtures (score 46, singles only) are
   shallow. Under the decided rule Easy must need pointing, box/line or a naked pair (Q-S2 asks for confirmation).
4. **S0.1's first test fails as written.** Of the 12 constructed fixtures with a `notSolvableWith` certificate, 5 are
   not required for their own label (`constructed-normal-1`, `-3`: naked-pair peak, the Normal floor includes
   `nakedPair`; `constructed-nightmare-1..3`: the Nightmare floor includes `forcingChain`). Also the variant id is
   `killer`, not `killer9`, and a new quick suite must be listed in `generator/tests.html`
   (`generator/tests/suites/ui-contract.test.js:528-535`).
5. **S1.1 keeper ordering.** `createKeeper.offer` computes the distance before the uniqueness count
   (`generator/js/engine/digger.js:1053`); the floor must be attached and the distance recomputed after the count, or
   a shallow candidate replaces a required one. The local search with `!isExact` can burn the attempt caps (1,024
   ratings, 32,768 proposals) at levels where "required" is rare; bound it.
6. **S1.2 stopping rule can lose the tier**: when the current puzzle needs the tier and the best removal does not, the
   rule still applies it if its score is closer to the target. And the target must not apply to the proposal digs of
   Nightmare and above ("as stuck as possible", `digger.js:658-671`).
7. **S2.1 breaks a core test the plan does not name.** `core/tests/suites/techniques.test.js:41-43` asserts that the
   classic registry order equals the frozen `LADDER` of `core/tests/fixtures/techniques.js:32-36`; moving
   `jellyfish` to 137 changes that order. The fixture's position ladder must stay frozen and the expected registry
   order must become a separate list.
8. **Every new technique id (2 in S2.2, up to 12 in S3) needs real fixture positions and a Player help example.**
   `techniques.test.js:71-87` requires 2 positive positions with the exact Finding and 1 negative position per classic
   id; `player/tests/suites/help.test.js:126-129` requires an example for exactly the registry, generated into
   `player/js/ui/help-examples.js` (not `player/tests/fixtures/...` as S2.1 says) by
   `player/tests/tools/make-technique-examples.js`, which handles classic9, diagonalX, hyper, killer and greaterThan
   only (no jigsaw for `lawOfLeftovers`). `bugPlusOne` breaks `techniques.test.js:64-69` (only `uniqueRectangle` may
   assume uniqueness).
9. **The quick replay suite pins generator output.** `generator/tests/suites/replay.test.js:611-635` checks 14 golden
   requests (10 generated live) against hand-recorded rows and score sequences in
   `generator/tests/fixtures/replay-goldens.js`; `node tests/replay-fixtures.js` regenerates only
   `replay-wire.js` (G09-G12). Every output-changing step (S1.1, S1.2, S2.1, S2.2, each S3 group) breaks the quick set
   until the goldens are re-derived; `steps.test.js:879-889` pins one too.
10. **Smaller corrections.** `cageLocked` (S3 group 5) is not needed (`cageCombo` already does the cage-to-unit
    elimination, `core/js/engine/tech-cage.js:11-16`, and the killer pair is a naked pair once `cageCombo` restricts
    the cells); the `killer` and `greater-than` suites named in §8 are heavy (`generator/tests/manual/`), not quick;
    the comment "otherwise master's floor would lose Unique Rectangle" applies to Nightmare's floor.

Verdict: **execute, with the corrections of §4 and §5.1, the owner answers of §5.2, and the task order of §6**
(S2.1 before S1; heavy gates consolidated where intermediate results would mislead).

---

## 1. Baseline at HEAD `6abcb9f`

Windows, Node v26.13.0 (CI uses 24). Both quick sets ran while other test runs shared the machine, so durations are
upper bounds.

| Command | Suites | Tests | Failed | Duration |
|---|---|---|---|---|
| `cd generator && node tests/node-runner.js` | 43 | 2,818 | 0 | 110.8 s running, 111.2 s total |
| `cd player && node tests/node-runner.js` | 29 | 1,609 | 0 | 30.1 s running, 30.3 s total |

The player run prints a Node warning about `localStorage` without `--localstorage-file`; harmless.

---

## 2. Findings verified

### 2.1 The probe of §7 (run from `generator/`, seeds 1..N, `trace: 'off'`)

| Level | N | Peaks | Score min / median / max | Band position min / median / max | Plan §1.1 |
|---|---|---|---|---|---|
| normal | 12 | nakedPair 5, hiddenPair 4, nakedTriple 3 | 209 / 261 / 315 | 0.13 / 0.37 / 0.61 | identical |
| hard | 24 | simpleColouring 21, xWing 2, swordfish 1 | 497 / 568 / 699 | 0.32 / 0.56 / 1.00 | identical (seed 3 `simpleColouring:2`, seed 8 `pointing:1 simpleColouring:1`) |
| expert | 12 | xyWing 12 | 887 / 958 / 989 | 0.62 / 0.86 / 0.96 | identical |

Observation 2 ("scores hug the top") holds for Expert, partly for Hard, and not for Normal.

### 2.2 Floor solves at HEAD (`required` as S0.1 defines it, `assumeUniqueness: true`)

| Variant, level | n | required | shallow (seed: peak) |
|---|---|---|---|
| classic9 normal | 12 | 7 | 1, 2, 3, 6, 8: nakedPair (an Easy technique) |
| classic9 hard | 24 | 24 | none |
| classic9 expert | 12 | 12 | none |
| classic9 master | 12 | 8 | 1, 3, 5, 12: xyWing (Expert) |
| classic9 nightmare | 12 | 0 | all: forcingChain (Master); chain lengths per puzzle at most 3, 4 or 5 (one puzzle 6) |
| killer normal / hard / expert | 6 each | 2 / 0 / 0 | hard: ruleOf45 x6 (Normal); expert: simpleColouring x5, cageSplit x1 (Hard) |
| jigsaw9 normal / hard / expert | 6 each | 3 / 6 / 2 | expert: simpleColouring x4 |
| greaterThan normal / hard / expert | 6 each | 2 / 4 / 6 | hard: nakedQuad, hiddenTriple |

Chain lengths of the Master puzzles that use `forcingChain`: 3, 4, 4 links. Constructed fixtures of
`generator/tests/fixtures/rated.js`: veryEasy vacuous; easy 0/3 required (singles only, score 46); normal 1/3; hard
3/3; expert 3/3; nightmare 0/3. The published "classic-medium" (labelled normal) rates Easy (48), as the fixture's
header says.

### 2.3 The code-level causes of §1.2

| Claim | Status | Evidence |
|---|---|---|
| Score `V + P + 0.25 P log2(1 + W/P)`, level = band | verified | `generator/js/engine/difficulty.js:5-13`, `breakdown` 233-271, `classify` 392-426 |
| `spec` allows `1.25 w < bandMax`, no tier | verified | `difficulty.js:334-370`, filter 344-348 |
| Guided dig keeps the highest score below `spec.max` | verified | `digger.js:654-702` (refusal at 700), `digGuidedSteps` 719-794, `value > bestObjective` 773 |
| Exact = solved and level match | verified | `digger.js:1266`, `1085`, `1687`, `1712` |
| `distanceToLevel` ignores technique | verified | `digger.js:1507-1515` |
| Local search stops at `score >= spec.min` | verified | `digger.js:1392` |
| Ladder order disagrees with weights in three places | verified | `cageCombo` order 55 weight 40 after `boxLine` 50/50 (`tech-cage.js:615, 623`); `ineqChain` 65/40 after `nakedPair` 60/120 (`tech-ineq.js:476`, `tech-subset.js:220`); `jellyfish` 160/520 after `xyWing` 140/650 and `xyzWing` 150/750 (`tech-fish.js:518-520`, `tech-wing.js:528, 538`) |
| One id for every chain length and Nishio depth | verified | `core/js/engine/tech-chain.js:516-536`; default `maxChainLength` 12 (62), `maxNishioDepth` 2, ceiling 3 (65-66) |
| Weights are engineering priors | verified | `difficulty.js:38-39` |

### 2.4 Tier table of §2 (derived with `spec()` at HEAD)

Exactly as written: easy = pointing, boxLine, nakedPair (+ cageCombo, ineqChain on their variants); normal = hiddenPair,
nakedTriple, hiddenTriple, nakedQuad, hiddenQuad (+ ruleOf45, minMaxForcing); hard = xWing, simpleColouring, swordfish,
jellyfish (+ cageSplit); expert = xyWing, xyzWing; master = wWing, uniqueRectangle, forcingChain; nightmare = nishio;
hell1 = none. Note: classic9 does not offer hell2 (`difficultySupport` ends at hell1) and classic6 offers only veryEasy
and hard.

---

## 3. Anchors and APIs checked

| Plan reference | Status | Note |
|---|---|---|
| §3 digger functions (`digSteps`, `digGuidedSteps`, `digStageSteps`, `digLevelSteps`, `refineDown`, `localSearchSteps`, `createKeeper`, `keptPuzzle`, `distanceToLevel`, `generateSteps`) | verified | generator functions at 449, 719, 821, 1172, 1100, 1320, 1041, 1075, 1507, 1572; `GUIDED_FROM_LEVEL = 0` (599): every level runs the guided dig |
| `events.js` VOCABULARY, `tune.hit` / `tune.miss` ~850 | verified | 850-853; args are explicit lists (`entry`, 773) |
| `rng.fork(tag)` independent stream | verified | `generator/js/engine/rng.js:77-79`: derived from (seed, tag) only, no draw from the parent |
| `cache.js:47` `SCHEMA_VERSION = 2` | verified | |
| `export.js:137` writes `ratingVersion` | verified | whitelist 135-139: a `floor` field on the rating object does not leak into exports |
| `logical-solver` `solve(model, givens, { allowedTechniques, collectSteps, assumeUniqueness, budget })` | verified | a budget error throws (it does not return "stuck"); `report.state.unsolvedCount` exists (used at `digger.js:670`) |
| `SG.techniques.register({...})` fields | verified | `core/js/engine/techniques.js:78`; `GROUPS` frozen at 75; `list()` sorted by order, then baseCost, then id (131) |
| §3 `manual/difficulty.test.js` pins 721-733, ratingVersion 759-767, 1316 | verified | |
| `rated.js` constructed rows ~120-157 | verified | rows 120-157, technique sets 103-111 |
| `regression.js`, `soak.js`, `perf.js`, `qualify.js` | verified | `soak.js` flags `--variant`, `--level`, `--weights`, `--bands`, `--quick` (header 1-60) |
| S0.1 `technique-weights.test.js` as harness model | verified | 2 tests; the second already requires strictly increasing weights per group in ladder order (25-33) |
| S0.1 "classic9 and killer9" | **wrong id** | the variant is `killer` |
| S1.1 anchors 991, 1051, 1085, 1100-1147 (1117, 1134), 1255-1284, 1392, 1469, 1507-1515, 1739-1741 | verified | |
| S1.2 anchors 821-880 (ctx 865-875), 719-794 (773-776) | verified | |
| S1.2 `explain.dig.code.deeper` | verified | `generator/js/ui/locale.en.js:251`; also `dig.keep` (488) and the paragraph at 241 say "hardest" |
| S1.2 Greater-Than strategy, Killer `digKiller` | verified | `generator/js/variants/greater-than.js:215`, `killer.js:1010-1018` |
| S2.1 orders: `tech-cage.js` rows ~613-623, `tech-ineq.js:476`, `tech-fish.js` ~518-529 | verified | rows 615-617; `define('jellyfish', 56, 160, ...)` at 518 |
| S2.1 "`player/tests/fixtures/help-examples.js` is generated" | **wrong path** | `player/js/ui/help-examples.js`, written by `player/tests/tools/make-technique-examples.js` |
| S2.2 `findForcingChain` / `findNishio`, `depth` in i18nArgs ~505-507 | verified | 389, 472, 506; chain length is `best.length` in `i18nArgs.length` (385) |
| S2.3 `difficulty.js:58`, `replay.test.js:1601`, `importer.js:632` | verified | |
| S3 inventory (UR types 1 and 2 only, `tech-wing.js:477`; chains without grouped links) | verified | |
| §4 rule 4 "8 script lists" for a new core file | verified | generator `index.html`, `tests.html`, `tests/node-runner.js`, `js/worker/gen.worker.js`; player `index.html`, `tests.html`, `tests/node-runner.js`, `help.html` |
| §8 "quick suites greater-than, killer" | **wrong** | `generator/tests/manual/greater-than.test.js`, `killer.test.js` are heavy |
| Companion path `D:\git\tmp\...` | wrong | not a code issue |

---

## 4. Step-by-step review

### S0.1 `certifyFloor` and tier sets

Correct. `allowedFor` reproduces the `spec` filter (same inputs, same order). Soundness of `assumeUniqueness: true`:
every call site of the plan certifies a puzzle whose uniqueness is already proven: dug samples pass the safety net
`secureUniqueness` (`digger.js:919`); keeper candidates pass `countWithin(...) === 1` (1051-1060); local-search moves
are kept only after `uniqueWithin` (1443-1447) or are clue additions; `refineDown` only adds clues; soak and tests
use generated or fixture puzzles with one solution. Notes:

- `spec(level, model)` throws `difficulty.unsupportedLevel` (`difficulty.js:336-338`). `certifyFloor` is safe in the
  digger (it only sees the requested level) but tests and soak must skip unsupported levels.
- Comment fix: it is Nightmare's floor (Master's allowed set) that contains Unique Rectangle, not Master's.
- Tests, corrected: (1) for constructed fixtures, assert `required === true` for the Hard and Expert entries (their
  certificate set equals the floor) and `false` for `constructed-normal-1`, `-3` and `constructed-nightmare-1..3`
  (documented shallow cases), with a comment that the certificate sets of `rated.js` are smaller than the floors;
  (2) the Hard tier on classic9 equals `['xWing', 'simpleColouring', 'swordfish', 'jellyfish']` (ladder order); the
  veryEasy tier is empty and vacuous; (3) `floor ∪ tier = allowed` for every supported level of classic9 and `killer`;
  (4) the shallow case without a rare hidden-quad puzzle: a constructed Normal puzzle certified for `hard` has
  `required === false`. Register the new suite in `generator/tests.html`. The pinned values must be re-checked by
  every later task that adds a technique to a floor (S2.2, S3): a new Hard technique can make an Expert fixture
  solvable by the Expert floor.
- Docs as planned (`generator/design.md` §6.7, §13.7, DEVELOPERGUIDE both languages "Adding a technique").

### S0.2 Soak columns

Feasible. Add a fourth column the plan lacks: the histogram of the longest forcing-chain length per exact puzzle
(from `steps` with `collectSteps: true`, `i18nArgs.length`); Q-S1 needs it. Gate: run
`node tests/soak.js --quick --no-gate` (about 700 puzzles) before S2.1 and S1 land, and record it in
`docs/difficulty-v3/baseline.md` (a new file).

### S1.1 Exact = in band and required

The design is right; the integration needs these corrections:

- **Keeper.** In `offer`, after `countWithin(...) === 1`, call `ensureFloor`, then recompute
  `distanceToLevel` and compare with `keeper.distance` again before storing. `keeper.closer()` stays a cheap pre-test.
- **Local search.** `localSearchSteps` has no `level` argument; use `spec.level`. Call `ensureFloor(next)` before the
  keeper offer (1463) as well as for the loop test. Bound the continuation once the band is reached: a new constant
  (e.g. `SHALLOW_SEARCH_RATINGS = 128`) of full ratings after the first in-band state; without it a level whose tier
  is rarely reachable spends the whole attempt caps (`CAP_RATINGS` 1,024, `CAP_PROPOSALS` 32,768,
  `digger.js:630-631`).
- **Events.** `tune.miss` reads "Missed the level: wanted "{requested}", got "{achieved}"" (`locale.en.js:513`), which
  is wrong for an in-band shallow sample ("wanted Hard, got Hard"). Use a new key `tune.shallow` (args `requested`,
  `achieved`, `score`, `scoreMin`, `scoreMax`, `floorLevel`, `sample`, `maxSamples`) in `events.js` VOCABULARY, both
  locales and the step view, rather than a `required` argument on `tune.miss` (Q-S3).
- **Warning.** `difficulty.shallow` goes through `result-view.js` `WARNING_KINDS` (23-27); otherwise it is listed as
  "other". `app.js:817` keys the announcement on `difficulty.approximate`.
- **Steering (step 4).** `tier` from the oracle ("a tier technique was used") equals "required" only when ladder orders
  are monotone in the weights, i.e. after S2.1. Do S2.1 first (§6).
- Tests as planned; for (b) use the Normal fixture certified as `hard` (above), run through `keptPuzzle`.

### S1.2 A target inside the band

- **Comparator and termination.** `better(a, b)` is lexicographic (tier, then distance or score), so a linear scan is
  well defined; ties keep the first in the shuffled pool (deterministic). Each applied step removes at least one clue
  and refusals are permanent, so the loop ends after at most the number of clues: it terminates.
- **Stopping rule fix.** Apply `best` iff it exists and (`target === null` or `!current.tier` or (`best.tier` and
  `|best.score - target| < |current.score - target|`)). The plan's rule applies a tier-losing removal when it is closer.
- **Proposal digs.** `target = spec.max === Infinity || proposal ? null : ...`. The proposal objective returns
  `STUCK_SCORE + unsolved` (1e9 and more, `digger.js:670`) for exactly the removals it wants; a target would
  reject them.
- **Initial `current`.** One objective call with an empty group on the hand-over givens (counts one oracle call in
  `stats.oracleCalls`). `digSteps` does not return its last oracle value.
- **Expectations.** Many targets are unreachable from below: a puzzle that needs a Hard technique scores at least
  V + 1.25 x 320 = 446 on classic9 (V is about 46), so targets in [400, 446) end at the lowest reachable score.
- Step 3 (`refineDown` toward the target) is optional in the plan: Q-S4.
- Texts: `explain.dig.code.deeper`, `dig.keep`, the "hardest" paragraph (`locale.en.js:241, 251, 488` and the
  Vietnamese twins), `generator/js/ui/help.js`, both guides, `generator/design.md` §6.8.
- Test: "6 fixed seeds at hard, not all in [625, 700)" is deterministic; record the seeds.

### S2.1 Orders monotone in the weights

Numbers checked. `cageCombo` 44 (between `pointing` 40/40 and `boxLine` 50/50), `ineqChain` 46, `jellyfish` 137
(after `cageSplit` 135/520, before `xyWing` 140/650). Tie rule pins of `manual/difficulty.test.js:735-747` keep their
results (`jellyfish` 137 > `cageSplit` 135; `ineqChain` 46 > `pointing` 40). With S2.2 and S3 added (S3 table, with
`forcingChainLong` at 198) every pair satisfies `order(a) < order(b) => w(a) <= w(b)`, and every group stays strictly
increasing as `technique-weights.test.js:25-33` already requires. Additional work the plan omits:

- `core/tests/fixtures/techniques.js`: keep `LADDER` (positions: `before`, `through`) frozen; export the expected
  registry order as a new list (`ladder:` at 732 points to it). Without this the registry test fails; changing
  `LADDER` itself would move the `xyWing` / `xyzWing` positions.
- Killer solve paths can change (`cageCombo` before `boxLine`), and with them golden G09 and G10 (Killer) and the
  replay wire.
- Player hints change; `help.test.js` re-checks every example against the live hint, so regenerate
  `player/js/ui/help-examples.js` with the tool (gate).
- Docs: headers of the three files, `generator/design.md` §6.6/§6.7, DEVELOPERGUIDE both languages.

### S2.2 Finer chain ids

Feasible inside `tech-chain.js`. `findForcingChain` already keeps the shortest proof (`limit = min(maxLength,
bestLength - 1)`, 422), so the short id is `maxLength = min(chainLimit(ctx), 6)`, and the long id, tried later
in the ladder, can only find proofs of 7+ links when the short one found none; no minimum is needed. `findNishio`
scans depth by depth (489), so `nishioDeep` scans from depth 2 to `nishioDepth(ctx)` (default 2, so depth 3 only
with the option). Points:

- The window value decides whether Nightmare is reachable (§2.2): Q-S1.
- Cost: the long chain search repeats the short one's work when it runs; acceptable at Nightmare and above; a
  per-state cache of the 12-link search is an optimisation, not a requirement.
- Obligations per new id (`forcingChainLong`, `nishioDeep`): weight; `technique.<id>`, `.desc`, `.step` keys in both
  locales of both apps; 2 positive and 1 negative fixture positions in `core/tests/fixtures/techniques.js` (positions
  where the id fires first; need a search over generated Nightmare/Hell puzzles); `tech-chain.test.js` cases;
  `rated.js` `CHAINS`; the Player help example (gate, tool run; Hell-level positions may be slow to find); the
  registry test title "has the 21 techniques". Hell 1 gets a non-empty tier (`nishioDeep`).

### S2.3 Rating version 3

As planned. Extra: `steps.test.js:879-889` and the replay goldens move with every output change, not only here;
`docs/README.md` index entry; `notes.md` gets the before/after tables (S0.2 baseline and the final soak). The optional
history marker is Q-S6.

### S3 Missing techniques

Orders and weights: every new weight lands in the stated tier (1.25 w: skyscraper 412.5, twoStringKite 425,
emptyRectangle 475, finnedXWing 500, finnedSwordfish 600, remotePairs 550 -> Hard; wxyzWing 1,000 is not < 1,000
-> Master; bugPlusOne 1,150, xyChain 1,250 -> Master; lawOfLeftovers 250 -> Normal; cageLocked 75 -> Easy; alsXz
1,562.5, sueDeCoq 1,625 -> Nightmare), and the orders satisfy the invariant (§S2.1). Per group:

| Group | Assessment |
|---|---|
| 1 skyscraper, twoStringKite, emptyRectangle | single-digit patterns over complete units (`ctx.completeUnits`); emptyRectangle with `unitMeta.kind === 'box'` inside `find` keeps `variantScope: null` (it then counts as a classic id and needs fixtures). Medium-large |
| 2 finned fish | extend `findFish` (DFS over base lines) with a fin set restricted to one box; sashimi included. Medium |
| 3 remotePairs, wxyzWing, UR 3/4/hidden, bugPlusOne | `bugPlusOne` must update `techniques.test.js:64-69` (the list of uniqueness techniques) and is skipped by the oracle (`assumeUniqueness: false`), like UR; new UR step keys `technique.uniqueRectangle.type3.step`, `.type4.step`, `.hidden.step` in both apps. Large |
| 4 xyChain, grouped links | `xyChain` = `findForcingChain` with cell strong links only; grouped links change `forcingChain` proofs, so its recorded fixture Findings and the Master/Nightmare samples move; search cost grows with the graph. Large |
| 5 lawOfLeftovers, Killer cage/unit | `cageLocked` is not needed (issue 10): record the check in `docs/difficulty-v3/notes.md`. `lawOfLeftovers` (`jigsaw9`) needs jigsaw support in the help-examples tool and in the help renderer of examples. Medium |
| 6 alsXz, sueDeCoq | new core file `core/js/engine/tech-als.js` in the 8 script lists; keep group `chain` (a new group would touch `GROUPS`, `BASE_GROUPS` and their strings). Large |

Common obligations of every group: the fixture positions of `core/tests/fixtures/techniques.js` (a frozen helper list
for ids outside `LADDER`), Player help examples (tool run, gate), locales of both apps, `rated.js` families, replay
goldens, and a check that the 18 constructed fixtures keep their labels ("adjust the new weight, not the band"):
after S3 the Master puzzles whose chains have 3-4 links (likely turbot-fish patterns) can fall to Hard or Expert,
which may move `constructed-nightmare-*` too; measure before fixing weights.

---

## 5. Open decisions

### 5.1 Implementer-level resolutions (keep the plan's intent; to be confirmed in the joint report)

| Id | Plan text | Resolution |
|---|---|---|
| R1 | S0.1 tests | the corrected tests of §4 S0.1; `killer` instead of `killer9`; suite listed in `tests.html` |
| R2 | "check the exact field name of the unsolved count" | `report.state.unsolvedCount` |
| R3 | S1.1 keeper | floor after the count, distance recomputed |
| R4 | S1.1 local search | `spec.level`; `SHALLOW_SEARCH_RATINGS = 128` |
| R5 | "Check how the VOCABULARY lists allowed args" | explicit lists; add `tune.shallow` if Q-S3 = a |
| R6 | S1.2 stopping rule | the corrected rule of §4; no target for proposal digs |
| R7 | S1.2 initial `current` | one objective call with an empty group |
| R8 | S2.1 "read the pins before choosing" | 44 / 46 / 137 are consistent; no change |
| R9 | S2.1 core fixture | separate frozen positions ladder and expected registry order |
| R10 | S2.2 "short variant must return null beyond its window" | automatic with `maxLength = min(limit, window)`; no minimum for the long id |
| R11 | S3 group 5 "check first whether cageCombo already does both" | it does (a); (b) is a naked pair: no `cageLocked` |
| R12 | S3 group 6 group name | `chain` |
| R13 | step order | S2.1 before S1.1 (the tier steering assumes monotone orders); S0.2 baseline before both |
| R14 | gate timing | regenerate quick-suite goldens and help examples in the task that breaks them; run `qualify.js`, `perf.js --update-hashes` and the manual `difficulty` suite once after S2.2 and once at the end (an intermediate qualification after S1 alone would drop Nightmare and Hell 1 wrongly) |

### 5.2 Owner questions

**Q-S1. Chain-length window between `forcingChain` (Master) and `forcingChainLong` (Nightmare).**
(a) Plan: <= 6 / 7-12. Consequence: none of the 12 sampled Nightmare puzzles qualifies; Nightmare needs a 7+ link
chain or Nishio and is likely to fail qualification on most variants. (b) <= 4 / 5-12. Consequence: 6 of 12 sampled
Nightmare puzzles (chains of 5-6 links) qualify; Master keeps its 3-4 link chains; a 5-6 link chain step scores 1,400
instead of 1,100. (c) Decide from the S0.2 histogram before S2.2. **Recommendation: (b), confirmed by (c).**

**Q-S2. Confirm that Easy puzzles must need pointing, box/line reduction or a naked pair.**
(a) Yes, as decided for every level. Consequence: a singles-only puzzle that scores 45 or more is no longer an exact
Easy result (it is shallow; it can only be returned as an approximate fallback); Easy gets a technique identity.
(b) Treat Easy's tier as vacuous. Consequence: Easy stays "singles with more empty cells"; contradicts the decided
rule. **Recommendation: (a).**

**Q-S3. How a shallow result is shown (S1.1 step 5, "Decide").**
(a) Both warnings, `difficulty.approximate` and `difficulty.shallow`, plus a new step event `tune.shallow`. (b)
`difficulty.shallow` replaces `difficulty.approximate` when the score is in band. (c) No new warning (approximate
only). Consequence of (b): consumers keyed on `approximate` (`generator/js/ui/app.js:817`, the result view's yellow
alert and Retry button) miss shallow results unless updated. **Recommendation: (a).**

**Q-S4. S1.2 step 3, `refineDown` toward the target (optional in the plan).**
(a) Implement with S1.2. Consequence: up to `REFINE_RATINGS` (64) more ratings per proposal above the band. (b) Skip;
re-measure band positions after S1.2 and add it only if Hard and Expert still hug the top. **Recommendation: (b).**

**Q-S5. Levels that may stop being offered.**
With "required", Killer Hard and Expert (6/6 shallow today), Nightmare (12/12) and Hell 1 (needs depth-2 Nishio) may
fail `qualify.js`. (a) Accept what qualification decides and update `qualification.md` and `difficultySupport` (plan
§8). (b) Also run the §6 weight calibration (for example `ruleOf45`, `cageSplit`) in this plan. Consequence: weights
change, which §1.3 defers to a later calibration. **Recommendation: (a)**, with the outcome in `notes.md`.

**Q-S6. Marker for history entries rated with v2 (S2.3, optional).**
(a) A small "rating v2" marker in the result view for entries with `ratingVersion < 3` (two strings per language).
(b) No marker. **Recommendation: (a).**

---

## 6. Proposed task breakdown

Sizes: S ~100-300, M ~300-800, L ~800-1,600 changed lines including tests and docs. Every task ends with the quick
sets green (both apps when `core/` changed) and one commit. "Gate" lists the pre-approved heavy runs the task's
developer performs and records. Files owned are exclusive while the task runs.

| Id | Title | Scope | Depends on | Files owned | Gate | Size |
|---|---|---|---|---|---|---|
| ST1 | Floors and tiers | S0.1 with the corrected tests | - | `generator/js/engine/difficulty.js`, `generator/tests/suites/difficulty-floor.test.js` (new), `generator/tests.html`, `generator/design.md` §6.7 and §13.7, DEVELOPERGUIDE both | - | S-M |
| ST2 | Soak columns and baseline | S0.2 plus the chain-length column | ST1 | `generator/tests/soak.js`, `docs/difficulty-v3/baseline.md` (new) | soak `--quick` (baseline) | S |
| ST3 | Monotone orders | S2.1, global invariant test, core fixture order list | ST2 (baseline first) | `tech-cage.js`, `tech-ineq.js`, `tech-fish.js` (order only), `technique-weights.test.js`, `core/tests/fixtures/techniques.js`, design §6.6 | help examples regenerated; replay goldens re-derived | S-M |
| ST4 | Exact means required | S1.1 incl. keeper fix, bounded local search, warning, `tune.shallow` | ST3 | `generator/js/engine/digger.js`, `events.js`, `generator/js/ui/locale.en.js`, `locale.vi.js`, `result-view.js`, `generator/tests/suites/digger.test.js`, `events.test.js`, replay goldens | replay goldens re-derived | M-L |
| ST5 | Band target | S1.2 with the fixed stopping rule (and Q-S4) | ST4 | `digger.js`, generator locales, `generator/js/ui/help.js`, USERGUIDE and DEVELOPERGUIDE both, design §6.8, `digger.test.js`, replay goldens | replay goldens re-derived | M |
| ST6 | Chain ids | S2.2 with the Q-S1 window | ST5 | `core/js/engine/tech-chain.js`, `WEIGHTS`, locales of both apps, `core/tests/fixtures/techniques.js`, `tech-chain.test.js`, `rated.js`, `player/js/ui/help-examples.js` | help examples; replay goldens; `qualify.js` + `perf.js --update-hashes` + manual `difficulty` suite (first consolidated run) | M-L |
| ST7 | S3 group 1 | skyscraper, twoStringKite, emptyRectangle | ST6 | `tech-fish.js`, weights, locales x4, core fixtures, `tech-fish.test.js`, `rated.js`, help examples | help examples; goldens | L |
| ST8 | S3 group 2 | finned X-Wing, finned Swordfish | ST7 | same files as ST7 | same | M |
| ST9 | S3 group 3 | remotePairs, wxyzWing, UR 3/4/hidden, bugPlusOne | ST8 | `tech-wing.js`, weights, locales x4, core fixtures, `tech-wing.test.js`, `techniques.test.js` (uniqueness list), help examples | same | L |
| ST10 | S3 group 4 | xyChain, grouped links | ST9 | `tech-chain.js`, weights, locales x4, core fixtures, `tech-chain.test.js`, help examples | same | L |
| ST11 | S3 group 5 | lawOfLeftovers (+ jigsaw example support), cage check note | ST10 | `tech-subset.js` or `tech-basic.js`, weights, locales x4, core fixtures, `player/tests/tools/make-technique-examples.js`, Player help example renderer, `notes.md` | same | M |
| ST12 | S3 group 6 | ALS: `tech-als.js`, alsXz, sueDeCoq, `forcingChainLong` to 198 | ST11 | `core/js/engine/tech-als.js` (new), the 8 script lists, weights, locales x4, core fixtures, a new core suite, help examples | same | L |
| ST13 | Version 3 and final gates | S2.3, notes, docs index, final measurements | ST12 | `difficulty.js` (`RATING_VERSION`), `cache.js`, `replay.test.js:1601`, `manual/difficulty.test.js` pins, `docs/difficulty-v3/notes.md`, `docs/README.md`, design §13.7, §14.1, guides | `perf.js --update-hashes`, replay wire, `qualify.js` + `qualification.md` + `difficultySupport`, manual `difficulty` suite, soak "after" run, §7 probe | M |

Dependency graph (one developer):

```
ST1 -> ST2 -> ST3 -> ST4 -> ST5 -> ST6 -> ST7 -> ST8 -> ST9 -> ST10 -> ST11 -> ST12 -> ST13
```

Parallelism: almost none inside this repository. ST2 (`soak.js`, a report) is file-disjoint from ST3 and could run
beside it, but its baseline must be measured before ST3 lands. The S3 groups all edit the weight table, four locale
files, the core fixture and the help examples, so they are sequential. Every task that changes generator output
re-derives the replay goldens; write a small helper that prints the `replay-goldens.js` rows of the current code in
ST4 and reuse it.

---

## 7. Risks

| Risk | Where | Mitigation |
|---|---|---|
| Nightmare and Hell 1 unreachable | S1, S2.2 | Q-S1; consolidated qualification after S2.2 |
| Killer Hard/Expert lost | S1 | Q-S5; soak per variant in ST2 |
| Easy changes meaning | S1 | Q-S2 |
| Generation time at rare tiers (caps burnt) | S1.1 | `SHALLOW_SEARCH_RATINGS`; perf gate |
| Fixture positions hard to find for rare techniques (nishioDeep, ALS, BUG+1, law of leftovers) | S2.2, S3 | position-search helper per technique; budget a search time per id |
| Help examples tool cannot find an example (rare techniques, jigsaw) | S2.2, S3 | extend the tool; allow constructed positions |
| Replay goldens rewritten many times | all output changes | dump helper; reviewers diff only scores and techniques |
| Rated fixtures move out of their labels after S3 | S3 | measure; adjust new weights within the tier, not the bands |
| Chain search cost with grouped links | S3 group 4 | measure on Nightmare samples; keep the 12-link limit |
| Heavy runs longer than 10 minutes (`qualify.js` took about 25 minutes, `docs/difficulty-rating/qualification.md:72`) | gates | run detached and monitored; they are tools, not quick tests |

---

## 8. Effort estimate

| Part | Tasks | Changed lines (incl. tests, docs, fixtures) | Agent time |
|---|---|---|---|
| S0 | ST1-ST2 | 400-800 | 3-5 h + soak |
| S2.1 | ST3 | 200-500 | 2-3 h + help examples, goldens |
| S1 | ST4-ST5 | 1,000-1,600 | 6-9 h |
| S2.2 | ST6 | 600-1,000 | 4-6 h + first heavy gates |
| S3 | ST7-ST12 | 5,000-8,000 (fixtures and locales dominate) | 25-40 h |
| S2.3 | ST13 | 300-600 | 3-4 h + final gates |
| Total | 13 tasks | 7,500-12,500 | 43-67 h of developer-agent time, plus heavy runs |
