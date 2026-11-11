# Rating v3 plan: make "Hard" really hard

Status: plan, 2026-11-11. Nothing in this document is implemented yet. It is written for an AI agent (or a
developer) who starts a fresh session with no memory of the audit that produced it. Read `AGENTS.md` at the
repository root first; its rules apply to every step here.

Companion document for the other project: `D:\git\tmp\pentomino\docs\difficulty-v3\plan.md` (independent; the
two projects share no code).

---

## 1. Why: the findings

### 1.1 What the generator produces today (probe of 2026-11-11, commit at HEAD of `main`)

Generated with `SG.pipeline.run({ variantId: 'classic9', difficulty, seed, trace: 'off' })`, seeds 1..N, on the
sources listed in `generator/tests/node-runner.js` (`SOURCE_FILES`). The probe script is in §7.

| Level | N | Peak technique (count of puzzles) | Score min / median / max | Band | Typical puzzle |
|---|---|---|---|---|---|
| normal | 12 | nakedPair 5, hiddenPair 4, nakedTriple 3 | 209 / 261 / 315 | [180, 400) | singles + 1–5 pointing/boxLine + 1–2 pairs |
| **hard** | 24 | **simpleColouring 21**, xWing 2, swordfish 1 | 497 / 568 / 699 | [400, 700) | singles + a few pointing/pairs + **one** colouring step (seed 3: only `simpleColouring:2`; seed 8: `pointing:1 simpleColouring:1`) |
| expert | 12 | **xyWing 12** | 887 / 958 / 989 | [700, 1000) | a Hard puzzle + exactly one XY-Wing |

Observations:

1. Every level is "the cheapest technique whose score enters the band, used once, plus singles". The score
   formula makes a single use of a technique of weight `w` worth at least `1.25·w + V` (V ≈ 46 on classic9),
   so one X-Wing (320) scores ≥ 446 → Hard; one colouring (360) ≥ 500 → Hard; one XY-Wing (650) ≥ 860 → Expert.
2. Scores hug the **top** of the band: the guided dig always applies the removal with the highest score below
   `spec.max`, so Hard puzzles are nearly Expert in score but not in technique.
3. Nothing checks that the level's tier is **required**. A puzzle whose peak is a hidden quad (weight 300,
   a "normal-tier" technique) scores ≥ 420 and is published as Hard although the Normal technique set solves
   it. The design says so openly: "`BASE_GROUPS` no longer defines levels" (`docs/difficulty-rating/report-detailed.md`).

### 1.2 Code-level causes (verified at these lines)

| Cause | Where |
|---|---|
| Score = `V + P + 0.25·P·log2(1 + W/P)`; level = band of the score only | `generator/js/engine/difficulty.js` header (lines 5-13), `breakdown()` 233-271, `classify()` 392-426 |
| `spec(level)` allows every technique with `1.25·w < bandMax`; no notion of "tier" or "floor" | `difficulty.js` `spec()` 334-370 |
| Guided dig maximises the score below `spec.max` | `generator/js/engine/digger.js` `removalObjective()` 654-702 (returns the score; `>= spec.max` refused), `digGuidedSteps()` 719-794 (`value > bestObjective` keeps the highest) |
| "Exact" = `rating.solved && rating.level === level` | `digger.js` 1266 (`digLevelSteps`), 1085 (`keptPuzzle`), 1687 / 1712 (`generateSteps`) |
| Closeness ignores technique | `digger.js` `distanceToLevel()` 1507-1515 |
| Local search stops as soon as `score >= spec.min` | `digger.js` 1392 (`localSearchSteps` loop condition) |
| Solver ladder order disagrees with the weights in three places, so "used" ≠ "needed" | `core/js/engine/tech-cage.js` (cageCombo order 55, weight 40, tried after boxLine 50/50); `tech-ineq.js:476` (ineqChain 65/40 after nakedPair 60/120); `tech-fish.js` (jellyfish order 160, weight 520, after xyWing 140/650 and xyzWing 150/750) |
| One id for every forcing-chain length (≤ 12 links) and every Nishio depth (1–3): hell1/hell2 differ from nightmare only by volume | `core/js/engine/tech-chain.js` 516-536 |
| Weights are "engineering priors, not human measurements" | `difficulty.js` 38-40 |

### 1.3 Decisions already taken with the owner (do not re-open)

- Change the **model**, not only the generation (rating version 3).
- Scope: difficulty rating and generation only. Architecture cleanups are out of scope.
- A puzzle of level L must **need** a technique of L's tier: the technique set of level L−1 must get stuck on
  it. One such step is enough (no "at least two tier steps" rule).
- Scores should spread across the band instead of hugging its top.
- Keep the current weights unless a later calibration run (§6) says otherwise.

---

## 2. Vocabulary used below

- **allowed(L)**: `spec(L).allowedTechniques`, every technique with `1.25·w < bandMax(L)` (all for hell2).
- **floor(L)**: `allowed(L−1)`; empty for veryEasy.
- **tier(L)**: `allowed(L) − allowed(L−1)`. Derived from `WEIGHTS` and `TABLE`, never a hand-written table.
  With today's weights:

  | Level | tier(L) |
  |---|---|
  | veryEasy | ∅ (vacuous) |
  | easy | pointing, boxLine, nakedPair, cageCombo, ineqChain |
  | normal | hiddenPair, nakedTriple, hiddenTriple, nakedQuad, hiddenQuad, ruleOf45, minMaxForcing |
  | hard | xWing, simpleColouring, swordfish, jellyfish, cageSplit |
  | expert | xyWing, xyzWing |
  | master | wWing, uniqueRectangle, forcingChain |
  | nightmare | nishio |
  | hell1, hell2 | ∅ (vacuous) until S2.2 adds deeper ids |

- **required** (of a rated puzzle for level L): the logical solver restricted to floor(L) does **not** solve
  it. `vacuous` when tier(L) is empty (then `required` is true by definition).
- **shallow**: in band but not required.

---

## 3. The code you will touch (orientation)

```
generator/js/engine/difficulty.js   LEVELS, WEIGHTS, TABLE, spec(), breakdown(), classify(), rate(), RATING_VERSION
generator/js/engine/digger.js       digSteps (stage A), digGuidedSteps (stage B), removalObjective, digStageSteps,
                                    digLevelSteps (one sample: dig → rate → tune), refineDown, localSearchSteps,
                                    createKeeper / keptPuzzle, distanceToLevel, generateSteps (outer loop)
generator/js/engine/events.js       VOCABULARY of step events (tune.hit / tune.miss at ~850)
generator/js/engine/rng.js          mulberry32; rng.fork(tag) derives an independent stream from (seed, tag)
generator/js/engine/replay.js       replays the dig log; reads dig.* events and the log entries {op:'remove'|'reveal'}
generator/js/ui/locale.en.js, locale.vi.js   every shown string (i18n parity suite checks both)
generator/js/ui/cache.js            SCHEMA_VERSION = 2 (line 47): pre-generated puzzles; another version is purged
generator/js/ui/export.js           writes rating fields incl. ratingVersion (line 137)
core/js/engine/logical-solver.js    solve(model, givens, { allowedTechniques, collectSteps, assumeUniqueness, budget })
                                    → report { solved, techniqueCounts, score, steps?, state }
core/js/engine/tech-*.js            SG.techniques.register({ id, group, baseCost, order, i18nKey, variantScope,
                                    assumesUniqueness, find })
generator/tests/suites/*.test.js    quick suites (run after every change)
generator/tests/manual/difficulty.test.js   heavy; pins technique→level mappings (721-733), ratingVersion (759-767, 1316)
generator/tests/fixtures/rated.js   reference puzzles with technique certificates (constructed: 120-157)
generator/tests/fixtures/regression.js   output hashes (perf suite); update only with approval
generator/tests/soak.js, perf.js, qualify.js   heavy tools; run only with approval
docs/difficulty-rating/qualification.md  offered (variant, level) pairs; manual/difficulty.test.js asserts it
```

Data shapes you will extend:

- `DifficultySpec` (returned by `spec`): add `floorTechniques: string[]`, `tierTechniques: string[]`.
- `Rating` (returned by `classify`/`rate`): optionally add `floor: { required, vacuous, floorLevel,
  unsolvedCount }` (attached by the digger, not by `classify`, so `rate()` stays one solve).
- `LevelPuzzle.exact` / `GeneratedPuzzle.exact`: meaning becomes "in band AND required".

---

## 4. Rules for the implementing agent

From `AGENTS.md`, plus specifics of this work:

1. Run the quick suites after every step: `cd generator && node tests/node-runner.js`. After any change under
   `core/`, also `cd player && node tests/node-runner.js`.
2. Never run `--all`, `--manual`, `soak.js`, `perf.js`, `qualify.js`, `--update-hashes`, `SG_UPDATE_HASHES`,
   `SG_DEEP=1`, the player browser scripts, or regenerate `help-examples.js` unless the owner approves that run
   explicitly. Steps that need such a run are marked **APPROVAL GATE** below. Stop at the gate, report, wait.
3. Do not weaken or delete a test to make a run pass. If a quick suite fails and the cause is unclear, report it.
4. No new file under `core/js/` unless unavoidable (it must then be added to 8 script lists; `ui-contract`
   suites fail otherwise). This plan avoids it.
5. Classic scripts only (IIFE on the `SG` global); 2-space indent, single quotes, semicolons, ≤ 110 chars.
6. Every shown string goes through `SG.i18n.t()` and exists in `locale.en.js` and `locale.vi.js`.
7. Update, in the same change as the code: `generator/design.md` (§6.7 levels and techniques, §6.8 digging,
   §13.7 `SG.difficulty` API, §14.1 known limitations), `DEVELOPERGUIDE.md` and `DEVELOPERGUIDE.vn.md`,
   `USERGUIDE.md` and `USERGUIDE.vn.md` where they describe levels or the dig. `help.test.js` reads the guides.
8. Existing reports under `docs/difficulty-rating/` are dated records: do not edit them. Add new files.
9. One commit per step (S0.1, S0.2, S1.1, …), each leaving the quick suites green.

---

## 5. The steps

Order: **S0 → S1 → S2**. S0 changes no generator output (safe). S1 changes which puzzles are produced (hashes
move, approval needed). S2 changes solver order and ids (rating version 3).

### S0.1 — `certifyFloor` and tier sets (no output change)

**File:** `generator/js/engine/difficulty.js`.

1. Extract the technique filter of `spec()` (lines 344-348) into a function:

   ```js
   // Techniques a level may use: registered, with a weight, applying to the variant, and able to occur in the
   // band (1.25 * w < max; everything for the top level). In ladder order.
   function allowedFor(i, variantId) {
     const max = bandMax(i);
     return SG.techniques.list().filter(function (tech) {
       return hasOwn.call(WEIGHTS, tech.id) &&
         (variantId === null || SG.techniques.appliesTo(tech, variantId)) &&
         (max === Infinity || SCORING.peakBound * WEIGHTS[tech.id] < max);
     }).map(function (tech) { return tech.id; });
   }
   ```

2. In `spec()` compute `allowed = allowedFor(i, variantId)`, `floor = i === 0 ? [] : allowedFor(i - 1, variantId)`,
   `tier = allowed.filter(id => floor.indexOf(id) === -1)`. Return them as `allowedTechniques` (unchanged
   content), `floorTechniques`, `tierTechniques`. Keep `allowedGroups` as is.

3. Add and export:

   ```js
   // Does the puzzle need the level's tier? The solver restricted to the techniques of the level below must
   // get stuck. Uniqueness is assumed (the caller has a proof; otherwise master's floor would lose Unique
   // Rectangle and report "stuck" too often). One bounded solve; `budget` as in SG.logicalSolver.solve.
   function certifyFloor(model, givens, level, budget) {
     const s = spec(level, model);
     if (s.tierTechniques.length === 0) {
       return { required: true, vacuous: true, floorLevel: null, unsolvedCount: 0 };
     }
     const report = SG.logicalSolver.solve(model, givens, {
       allowedTechniques: s.floorTechniques, collectSteps: false, assumeUniqueness: true, budget: budget || null
     });
     return {
       required: report.solved !== true,
       vacuous: false,
       floorLevel: LEVELS[levelIndex(level) - 1],
       unsolvedCount: report.solved === true ? 0 : report.state.unsolvedCount
     };
   }
   ```

   Check the exact field name of the unsolved count on `report.state` (the digger reads
   `report.state.unsolvedCount` at line 670; reuse that).

4. `rate()`, `classify()`, `RATING_VERSION` unchanged in this step.

**Tests:** new quick suite `generator/tests/suites/difficulty-floor.test.js` (look at an existing suite such as
`technique-weights.test.js` for the harness style: `SG.test.describe/it/assert`, boards from `SG.testkit`).

- For every entry of `SG.fixtures.rated.constructed` (file `generator/tests/fixtures/rated.js`, ~120-157) that
  carries a `notSolvableWith` / level certificate: `certifyFloor(model9, givens, entry.level).required === true`.
- `spec('hard', model9).tierTechniques` equals exactly `['xWing', 'simpleColouring', 'swordfish', 'jellyfish']`
  on classic9 (cageSplit does not apply to classic); `spec('veryEasy', model9).tierTechniques` is `[]` and
  `certifyFloor(...).vacuous === true`.
- `floorTechniques ∪ tierTechniques === allowedTechniques` for every supported level of classic9 and killer9.
- A Hard puzzle generated with a hidden quad as its peak (construct one or take any puzzle whose rating has
  `hardestTechnique === 'hiddenQuad'`) has `required === false` for `hard` (this documents the shallow case).

**Docs:** `generator/design.md` §6.7 (the tier table above is now derived in code), §13.7 (`SG.difficulty.certifyFloor`,
new spec fields); `DEVELOPERGUIDE.md` + `.vn.md` "Adding a technique" (a new technique joins the tier of the
first level whose band admits it; nothing else to declare).

**Verify:** `cd generator && node tests/node-runner.js --suite=difficulty-floor,technique-weights,digger`, then the
full quick set.

### S0.2 — calibration columns in `soak.js` (edit only)

**File:** `generator/tests/soak.js`. Per (variant, level) add to the printed summary:

- histogram of `rating.hardestTechnique`;
- band position `(score − min) / (max − min)` as deciles plus the median (skip for hell2);
- shallow rate: share of exact puzzles with `SG.difficulty.certifyFloor(model, givens, level).required === false`.

Do not change the gate or the exit code. **APPROVAL GATE** to run it (e.g.
`node tests/soak.js --variant=classic9 --level=hard`; read the file header for its flags). Record the output of
the first run (before S1) in a new file `docs/difficulty-v3/baseline.md`: it is the "before" picture.

### S1.1 — a puzzle is exact only when it is in band **and** required

**File:** `generator/js/engine/digger.js`.

1. Helpers near `rateCounted` (~991):

   ```js
   // Attaches the floor certificate to a rating of the requested level (one restricted solve, not counted
   // against CAP_RATINGS: it is a check, not a rating). Idempotent.
   function ensureFloor(model, givens, rating, level, budget) {
     if (!rating || rating.solved !== true || rating.level !== level || rating.floor !== undefined) return rating;
     rating.floor = SG.difficulty.certifyFloor(model, givens, level, budget);
     return rating;
   }
   function isExact(rating, level) {
     return rating.solved === true && rating.level === level &&
       (rating.floor === undefined || rating.floor.required === true);
   }
   ```

   `rating.floor === undefined` counts as exact only so that code paths that never certify (none after this
   step) do not break; every acceptance path below certifies first.

2. Use them:
   - `digLevelSteps` rate step (1255-1263): after the rating is known and before `reportRating`, call
     `ensureFloor(dug.model, dug.givens, rated, level, budget)`. Line 1266 becomes `const exact = isExact(rating, level);`.
   - `keptPuzzle` (1085): `exact: isExact(kept.rating, level)`.
   - `createKeeper.offer` (1051): after `countWithin(...) === 1` succeeded, call `ensureFloor(candidate.model,
     candidate.givens, candidate.rating, level, budget)` before storing. (Uniqueness is proven here, so
     `assumeUniqueness: true` in `certifyFloor` is sound.)
   - `generateSteps`: lines 1687 and 1712 already test `puzzle.exact` / `best.exact`; they inherit the new meaning.
   - `localSearchSteps` loop (1392): `while (!isExact(rating, level) && !capsExhausted(caps))`. Inside, a move is
     kept today iff unique, solved, `score >= current score`, `< spec.max` (1469). Add: call `ensureFloor` on
     `next` when `next.level === level` so the loop condition can see it. A move into the band that is still
     shallow is kept (score did not decrease) and the loop continues looking for a required one.
   - `refineDown` (1100-1147): the accept rule at 1134 (`next.solved && next.score >= spec.min`) stays; after
     the loop, certify the final `current` with `ensureFloor`. Revealing more clues can only make a puzzle
     easier, so if the result is in band but shallow, stop (the keeper / local search take over).

3. `distanceToLevel` (1507-1515): after computing `gap * 1000 + off`, add `0.5` when
   `rating.floor && rating.floor.required === false`. A shallow in-band puzzle (distance 0.5) still beats a
   level miss (≥ 1000) and loses to any certified one (0).

4. Steer the guided dig toward the tier at no extra cost. In `removalObjective` → `boundedObjective`
   (679-701) the solve already ran with the level's techniques; compute
   `const tier = spec.tierTechniques.some(function (id) { return report.techniqueCounts[id] > 0; });` and return
   `{ score: score, tier: tier }` instead of the bare score (refusals stay negative numbers). In
   `digGuidedSteps` (758-777) compare candidates by `tier` first (true beats false), then by the S1.2 rule.
   `trace.keep(group, value.score)` keeps the dig-log format unchanged. The proposal objective
   (`nightmareObjective`, 665-671) keeps returning a number; normalise it to `{ score, tier: true }` at the call
   site or let the comparison accept both shapes. Stage A (`digSteps`) is unchanged.

5. Warning and events:
   - When `generateSteps` finishes with a `best` that is in band but shallow (`best.rating.level === level &&
     !best.exact`), push `'difficulty.shallow'` into `warnings` (1739-1741) in addition to the existing
     `'difficulty.approximate'` rule (which fires because `!best.exact`). Decide: keep both or make `shallow`
     replace `approximate` in that case. Recommendation: both, so existing consumers still see `approximate`.
   - Add `difficulty.shallow` to `locale.en.js` / `locale.vi.js` (find where `difficulty.approximate` is
     translated and mirror it: "The puzzle is in the requested score band but does not need a {level} technique").
   - `events.js` VOCABULARY entries for `tune.hit` and `tune.miss` (~850-853): add the argument `required`
     (boolean) and emit it from `tuneStep` (`digLevelSteps` 1267-1284): `band.required = rating.floor ?
     rating.floor.required : null`. Check how the VOCABULARY lists allowed args (look at the `entry(...)` helper)
     and whether `replay.js` / `step-view.js` validate payload keys; the `events` and `replay` quick suites will
     tell you.

**Tests (quick):**

- `generator/tests/suites/digger.test.js`: add cases: (a) `SG.digger.generate(model9, 'hard', rng(seed), { maxAttempts: 2 })`
  for 4 fixed seeds returns `exact === true` and `rating.floor.required === true` (pick seeds that succeed
  within 2 attempts; record them in the test); (b) a result that is in band but shallow is **not** exact (feed
  the digger a `spec` whose `tierTechniques` is impossible, e.g. a stubbed spec, or construct the hidden-quad
  puzzle from S0.1 and run `keptPuzzle` on it).
- `difficulty-floor.test.js`: `distanceToLevel` is not exported; test through `generate`: with a seed that
  produces a shallow Hard sample and a certified one, the certified one is returned (hard to pin; optional).

**APPROVAL GATE (after S1.2, once):** regression hashes (`node tests/perf.js --update-hashes`), replay goldens
(`node tests/replay-fixtures.js` if `replay.test.js` fails on goldens), qualification (`node tests/qualify.js`,
then update `docs/difficulty-rating/qualification.md` and each variant's `difficultySupport` list if a level is
no longer offered; `tests/manual/difficulty.test.js` asserts the offered table), and one run of the manual
`difficulty` suite (`node tests/node-runner.js --suite=difficulty` from `generator/`, reads `tests/manual/`).

### S1.2 — aim at a point in the band, not at its top

**File:** `generator/js/engine/digger.js`.

1. `digStageSteps` (821-880): after `spec` is known, draw the target:

   ```js
   // Where in the band this sample aims (uniform; hell2 has no upper edge and keeps "as hard as possible").
   // A separate stream, so the 'random' and 'guided' streams and every existing seed's stage A are unchanged.
   const target = spec.max === Infinity ? null
     : spec.min + rng.fork('target').next() * (spec.max - spec.min);
   ```

   Pass `target` in the ctx object given to `digGuidedSteps` (line 865-875).

2. `digGuidedSteps` (719-794): keep a `current` state `{ score, tier }` of the puzzle as it stands. Initialise
   it with one objective call on the hand-over givens (one extra bounded solve per sample; or reuse the last
   stage-A oracle result if `digSteps` returns it, which is cleaner: check `first` in `digStageSteps`).
   Replace "keep the highest value" (773-776) with a comparator and a stopping rule:

   ```
   better(a, b):            a.tier && !b.tier → a
                            !a.tier && b.tier → b
                            target === null   → higher score (today's rule)
                            else              → smaller |score − target|
   after rating the pool:   best = the best candidate by better()
   continue (apply best) if: best exists AND (
                              !current.tier                       // keep digging until the tier is needed
                              OR target === null                  // hell2: as today
                              OR |best.score − target| < |current.score − target| )
   else stop
   apply: current = best
   ```

   Rationale: while the puzzle does not yet need a tier technique, removing clues is the only way to get there,
   so keep going (refusals already stop removals that overshoot `spec.max`). Once it does, stop when no removal
   brings the score closer to the target. The dig log, `dig.try/keep/accept/reject` events and `trace.keep`
   payloads are unchanged, so `replay.js` needs no change.

3. Optional (recommended): `refineDown` keeps revealing while `current.score > target` as long as the next
   reveal stays `>= spec.min` and keeps `required`; today it stops at the first in-band state (1117), which
   again lands near the top.

4. Greater-Than digs signs with its own strategy (`generator/js/variants/greater-than.js`); it does not go
   through `digGuidedSteps`, so S1.2 does not apply to it; S1.1 does (exactness is checked at the rating).
   Killer wraps `digStage` (`killer.js` `digKiller`) and inherits the target.

**Texts to update** (they say "the removal that makes it hardest"): `explain.dig.code.deeper` and any
`dig.*` help text in both locales, the dig paragraph of `generator/js/ui/help.js`, `USERGUIDE.md` / `.vn.md`,
`DEVELOPERGUIDE.md` / `.vn.md`, `generator/design.md` §6.8. New wording: "the removal that brings the score
closest to a point chosen inside the band, preferring removals that make a technique of the level necessary".

**Tests (quick):**

- Determinism: same config and seed → identical puzzle (`digger.test.js` has such a test; it must still pass).
- `digger.test.js`: for 6 fixed classic9 seeds at `hard`, scores lie in `[400, 700)` and **not all** in the
  top quarter `[625, 700)`. Seeds are fixed, so this is deterministic, not flaky.
- `difficulty-floor.test.js`: the 4-seed hard/expert sample of S1.1 still passes (exact + required).

**Acceptance (how you know S1 worked):** run the probe of §7 for classic9 hard with 24 seeds. Expect: every
result `rating.floor.required === true` and `exact === true` (or warning `difficulty.shallow` on the rare miss);
peak techniques spread over `xWing / simpleColouring / swordfish` instead of 21/24 colouring; band positions
spread over the band (median near 0.5, not 0.56 with a floor of 0.32 as today: 497 → 0.32, 568 → 0.56,
699 → 1.0).

**APPROVAL GATE:** see end of S1.1 (hashes, replay goldens, qualify, manual difficulty suite).

### S2.1 — solver order monotone with weight (core change)

Move **orders**, not weights (a weight moves scores and bands; an order moves only solve paths):

| Technique | File | Order today → new | Reason |
|---|---|---|---|
| cageCombo | `core/js/engine/tech-cage.js` (registration rows ~613-623, `order: row[2]`) | 55 → 44 | weight 40 < boxLine 50, tried after it |
| ineqChain | `core/js/engine/tech-ineq.js:476` | 65 → 46 | weight 40 < nakedPair 120, tried after it |
| jellyfish | `core/js/engine/tech-fish.js` (registration list ~518-529, `order: order`) | 160 → 137 | weight 520 < xyWing 650 / xyzWing 750, tried after them; 137 sits after cageSplit 135, before xyWing 140 |

The tie rule of `breakdown()` (`outranks`, difficulty.js 214-222: weight, then order, then id) must keep the
results pinned at `generator/tests/manual/difficulty.test.js:735-747`; read those assertions before choosing
the exact numbers.

**Test:** `generator/tests/suites/technique-weights.test.js` gains a global assertion: for every pair of
registered techniques, `order(a) < order(b) ⇒ WEIGHTS[a] <= WEIGHTS[b]`. It fails before the move; ship both
in one commit.

**Side effects:** the player's hints use the same ladder (`player/js/ui/play.js` ~694-760), so the hint shown
for some puzzles changes. `player/tests/fixtures/help-examples.js` is generated: if `help.test.js` of the
player fails on an example, **APPROVAL GATE** to regenerate it (do not edit by hand). Regression hashes move
again (same gate as S1).

**Docs:** headers of the three tech files, `generator/design.md` §6.6 / §6.7, DEVELOPERGUIDE (both languages)
"Adding a technique": state the invariant "orders are monotone in the weights; the technique-weights suite
enforces it".

### S2.2 — finer technique ids (minimal set)

Only inside `core/js/engine/tech-chain.js` (no new core file):

| New id | From | Window | Weight | First level whose band admits it (1.25·w < max) |
|---|---|---|---|---|
| `forcingChain` (kept) | findForcingChain | ≤ 6 links | 1100 | master (1375 < 1500) |
| `forcingChainLong` | findForcingChain | 7–12 links | 1400 | nightmare (1750 < 2400) |
| `nishio` (kept) | findNishio | depth 1 | 1700 | nightmare (2125 < 2400) |
| `nishioDeep` | findNishio | depth 2–3 | 2600 | hell1 (3250 < 3600) → hell1 gets a non-empty tier |

Implementation: give `findForcingChain(model, state, ctx, window)` / `findNishio(..., window)` a `{ min, max }`
window on chain length / depth and register two defs each (orders 190 / 192 and 200 / 202) with `find:
withBudget(function (m, s, c) { return findForcingChain(m, s, c, { min: 1, max: 6 }); })` and so on. Inspect
the Finding objects first: `nishio` already carries `depth` in `i18nArgs` (tech-chain.js ~505-507); find the
chain length in the forcing-chain Finding or compute it from its `links`. The short variant must return `null`
when the shortest proof it finds exceeds its window, so the restricted sets stay meaningful.

Touch list: `WEIGHTS` (difficulty.js), `technique.forcingChainLong` / `technique.nishioDeep` (+ `.step` keys) in
**both apps'** `locale.en.js` and `locale.vi.js`, the CHAINS set in `generator/tests/fixtures/rated.js`,
`core/tests/suites/tech-chain.test.js`, the technique catalogues of `generator/js/ui/help.js` and
`player/help.html` (check `help.test.js` of each app for what they verify), `docs/difficulty-v3/notes.md`.

Skyscraper, finned fish, XY-chain, ALS and the other missing patterns are step S3 below.

### S2.3 — rating version 3

S0 and S1 change no score semantics: **no version bump** for them. S2.1 changes solve paths (rare score
changes) and S2.2 adds ids and weights: ship S2.1 + S2.2 + this step as one release.

- `difficulty.js:58` `RATING_VERSION = 3`.
- `generator/js/ui/cache.js:47` `SCHEMA_VERSION = 3` (pre-generated puzzles of schema 2 are purged on load; the
  code already does that for another version).
- Tests pinned to 2: `generator/tests/manual/difficulty.test.js:759-767, 1316`, `generator/tests/suites/replay.test.js:1601`
  (search for `ratingVersion` and `RATING_VERSION` in `generator/tests/`). The player importer accepts any
  positive integer (`player/js/ui/importer.js:632`); exports keep writing `ratingVersion` (`export.js:137`).
- History entries (`sg.history.v1`) keep their stored rating; the UI shows what is stored. Decide whether to
  show a small "rated with v2" marker for old entries (optional; `result-view.js`).
- New file `docs/difficulty-v3/notes.md`: what changed and why (tier requirement, band target,
  order moves, new ids), with the before/after tables from the S0.2 baseline and the S1 acceptance probe.
- `generator/design.md` §6.7, §13.7, §14.1; DEVELOPERGUIDE both languages; `docs/README.md` index entry.

---

### S3 — missing solving techniques

**Inventory (audit of 2026-11-12).** Registered today (`core/js/engine/tech-*.js`): naked / hidden singles,
pointing, boxLine, naked / hidden pair / triple / quad, xWing, swordfish, jellyfish, simpleColouring, xyWing,
xyzWing, wWing, uniqueRectangle (types 1 and 2 only, `tech-wing.js:2, 476`), forcingChain (alternating
inference chains ≤ 12 links over single-cell and conjugate links only: no grouped links, no ALS nodes),
nishio; Killer: cageCombo, ruleOf45 (innies / outies), cageSplit; Greater-Than: ineqChain, minMaxForcing.

A puzzle that a person solves with one of the patterns below is today solved by `forcingChain` (weight 1100)
or `nishio` (1700) and published as Master or Nightmare, or the generator never produces it at Hard / Expert
because the level's technique oracle gets stuck. Adding them makes Hard and Expert richer (more than
"one colouring step") and stops over-rating.

**Add (in this order; each is one commit).** Weights are priors chosen to keep the S2.1 invariant
(order monotone in weight) and to land in the stated tier; ranks follow the common HoDoKu / SudokuWiki
ordering. No new core file for the first three groups.

| # | id | What it is | File | Order | Weight | Tier |
|---|---|---|---|---|---|---|
| 1 | `skyscraper` | one digit, two lines with two candidates each sharing one end: the other ends see the eliminations | `tech-fish.js` | 112 | 330 | hard |
| 1 | `twoStringKite` | one digit, a row pair and a column pair joined in a box | `tech-fish.js` | 114 | 340 | hard |
| 1 | `emptyRectangle` | one digit, a box whose candidates lie on one row + one column, plus a conjugate pair (a grouped link; only on boards with box units, set `variantScope` or test `unitMeta.kind === 'box'`) | `tech-fish.js` | 124 | 380 | hard |
| 2 | `finnedXWing` | X-Wing with extra candidates (fin) in one box; covers sashimi | `tech-fish.js` (extend `findFish` with a fin mask) | 126 | 400 | hard |
| 2 | `finnedSwordfish` | same for size 3 | `tech-fish.js` | 134 | 480 | hard |
| 3 | `remotePairs` | chain of identical bivalue cells; cells seeing both ends of an odd chain lose both digits | `tech-wing.js` | 132 | 440 | hard |
| 3 | `wxyzWing` | four cells, four digits, one non-restricted digit | `tech-wing.js` | 155 | 800 | master (1.25·800 = 1000) |
| 3 | `uniqueRectangle` (extend, same id) | add types 3 (naked subset with the roof), 4 (conjugate pair removes the other digit) and hidden rectangle | `tech-wing.js` `findUniqueRectangle` (477) | 180 | 900 | master |
| 3 | `bugPlusOne` | every open cell bivalue except one with three candidates: place the digit that appears three times in its units; `assumesUniqueness: true` | `tech-wing.js` | 182 | 920 | master |
| 4 | `xyChain` | chain of bivalue cells; found today as a generic forcing chain. Register as a restricted call of `findForcingChain` (cell links only) placed before it | `tech-chain.js` | 186 | 1000 | master |
| 4 | grouped links in `forcingChain` | strong / weak links whose node is a group of cells of one box-line intersection (grouped X-cycles, grouped AIC); no new id, same weight | `tech-chain.js` (link collection ~144-260) | — | — | — |
| 5 | `lawOfLeftovers` | Jigsaw only: n rows (columns) and n regions that differ in equally many cells: the cells sticking out on each side hold the same digits. `variantScope: ['jigsaw9']`, group `locked` | `tech-basic.js` or `tech-subset.js` | 87 | 200 | normal |
| 5 | Killer cage / unit interaction | check first whether `cageCombo` already does both: (a) a digit every remaining combination of a cage needs, whose cells in the cage lie in one unit, leaves the rest of that unit; (b) "killer pair": two cells of a cage that must hold {a, b} act as a naked pair in a shared unit. If not, add `cageLocked`, `variantScope: ['killer']` | `tech-cage.js` | 57 | 60 | easy |
| 6 | `alsXz`, `sueDeCoq` | almost-locked-set rules; need an ALS enumerator → **new core file `tech-als.js`** (add it to the 8 script lists, see `AGENTS.md`) | new | 194 / 196 | 1250 / 1300 | nightmare |

With these, move `forcingChainLong` (S2.2) to order 198 so the invariant holds (190 / 1100 forcingChain,
194 / 1250 alsXz, 196 / 1300 sueDeCoq, 198 / 1400 forcingChainLong, 200 / 1700 nishio, 202 / 2600 nishioDeep).

Deliberately **not** added (document them in `generator/design.md` §14.1 as "found as a forcing chain"):
3D Medusa, X-cycles and AIC as separate ids (the chain search already proves all their eliminations),
Franken / mutant fish, aligned pair exclusion, death blossom, ALS-XY-Wing (rare, costly to search, and
`nishio` covers them as trial and error).

**Per technique, the work is always the same:**

1. `find(model, state, ctx)` returning a Finding of the same shape as its neighbours in the file (read one
   existing `find*` first: `eliminations` / `placements`, `cells`, `i18nKey`, `i18nArgs`); call `ctx.check()`
   in loops; never write to `state`. Use `ctx.completeUnits` for strong links (a partial unit never gives one).
2. `SG.techniques.register` with the order above; add the weight to `WEIGHTS` in
   `generator/js/engine/difficulty.js` (`weightOf` throws for an id without one).
3. Strings in **both apps**: `technique.<id>`, `technique.<id>.desc`, `technique.<id>.step` in
   `generator/js/ui/locale.en.js` + `locale.vi.js` and `player/js/ui/locale.en.js` + `locale.vi.js` (the i18n
   parity suites check them); the technique catalogue of each app's help (`help.test.js` tells you what it reads).
4. Tests: a case in `core/tests/suites/tech-fish.test.js` / `tech-wing.test.js` / `tech-chain.test.js` with a
   hand-checked position where the technique fires and one where it must not; soundness is already covered
   generically if the suites replay findings against the solution (check `techniques.test.js`).
   `technique-weights.test.js` enforces the order invariant.
5. `generator/tests/fixtures/rated.js`: its certificate column names technique families (`'fish'`,
   `'subsets'`, …); add the new ids to the family sets it uses (and to the CHAINS set for `xyChain`).

**Effects to expect and report:** tier(hard) grows from 4 to 10 techniques, so Hard puzzles vary; some
puzzles rated Master / Nightmare today drop to Hard / Expert (correct); the reference puzzles of `rated.js`
must stay in their levels, otherwise adjust the new weight, not the band. Player hints name the new
techniques automatically (same ladder). Ship S3 inside rating version 3 (before the S2.3 bump or together
with it). **APPROVAL GATE:** hashes, qualify and `help-examples.js` as in S1 / S2.

## 6. Later (not in this plan, needs data): weight calibration

`docs/difficulty-rating/report-detailed.md` flags `ruleOf45` (260) and `cageSplit` (520) as over-weighted (every
rule-of-45 Killer lands in Hard) and the agent's audit noted `jellyfish (520) < xyWing (650)` and `hiddenTriple
(220) < xWing (320)` rank differently from common human scales. Changing weights moves bands and tiers; do it
only with `soak.js --weights` data and the owner's approval, as its own rating version.

---

## 7. Reproduce the findings (read-only probe)

Run from `generator/`. It loads the engine files in `SOURCE_FILES` order, generates puzzles, and prints the
peak technique and non-basic technique counts per seed. Adapt `probe(...)` lines as needed. After S1 add
`rt.floor && rt.floor.required` to the printed fields.

```js
// node -e "<this script>"   (from D:\git\tmp\sudoku\generator)
const fs = require('fs'), path = require('path'), vm = require('vm');
const src = fs.readFileSync('tests/node-runner.js', 'utf8');
const files = [...src.match(/const SOURCE_FILES = \[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map(x => x[1]);
for (const f of files) {
  if (!/^(\.\.\/core\/js\/engine|js\/engine|js\/variants|assets\/wordlists)/.test(f)) continue;
  const p = path.resolve(f); if (fs.existsSync(p)) vm.runInThisContext(fs.readFileSync(p, 'utf8'), { filename: p });
}
const W = SG.difficulty.WEIGHTS;
function probe(variant, level, seeds) {
  const scores = [], peaks = {};
  for (let s = 1; s <= seeds; s++) {
    const r = SG.pipeline.run({ variantId: variant, difficulty: level, seed: s, trace: 'off' });
    const rt = r.rating, c = rt.techniqueCounts || {};
    let hardest = null;
    for (const id in c) if (c[id] > 0 && (hardest === null || W[id] > W[hardest])) hardest = id;
    peaks[hardest] = (peaks[hardest] || 0) + 1; scores.push(rt.score);
    const nonbasic = Object.entries(c).filter(([id, n]) => n > 0 && W[id] >= 40).map(([id, n]) => id + ':' + n).join(' ');
    console.log('  seed', s, rt.level, rt.score, 'E', rt.empties, '|', nonbasic, '|', (r.warnings || []).join(','));
  }
  scores.sort((a, b) => a - b);
  console.log(variant, level, 'n=' + seeds, 'min/med/max', scores[0], scores[scores.length >> 1], scores[scores.length - 1], JSON.stringify(peaks));
}
probe('classic9', 'hard', 24); probe('classic9', 'normal', 12); probe('classic9', 'expert', 12);
```

The 2026-11-11 output is summarised in §1.1.

---

## 8. Risks and open points

- **Hit rate at hard/expert may drop** once "required" is enforced (a hidden-quad or triple-heavy puzzle in the
  band no longer counts). The digger's steering (S1.1 step 4) and the local search mitigate it; `qualify.js`
  decides whether a level stays offered. If classic6 or a hybrid variant loses `hard`, that is a correct
  outcome, not a bug; report it.
- **Cost:** one extra restricted solve per rated sample of the requested level (`certifyFloor`), one extra
  bounded solve per guided dig (the initial `current`). Both are cheaper than a full rating. Watch
  `tests/perf.js` p95 targets at the approval gate.
- **Vacuous tiers** (veryEasy, hell1, hell2 before S2.2): `required` is trivially true; the band stays the only
  rule there. Say so in the docs.
- **Oracle set ≠ rating set:** the dig oracle runs the level's set without uniqueness techniques; the rating
  runs everything with `assumeUniqueness: true`. `certifyFloor` uses the floor set with `assumeUniqueness: true`.
  A puzzle can therefore be "required" for the floor yet rated by a path that never uses a tier technique
  (greedy ladder). That is acceptable: "required" is a property of the puzzle, not of the path.
- **Greater-Than** and **Killer** have their own dig code paths; test them at hard/expert after S1 (quick
  suites `greater-than`, `killer`), since their tiers include `cageSplit` / `minMaxForcing` / `ineqChain`.

## 9. Checklist for the implementing agent

- [ ] S0.1 `allowedFor`, `floorTechniques`, `tierTechniques`, `certifyFloor`; suite `difficulty-floor`; design §6.7/§13.7; guides
- [ ] S0.2 soak columns; APPROVAL GATE run; `docs/difficulty-v3/baseline.md`
- [ ] S1.1 `ensureFloor`, `isExact`, keeper/local search/refine, `distanceToLevel +0.5`, tier-first objective, warning + locales, tune events
- [ ] S1.2 target per sample, comparator + stopping rule, texts in locales/help/guides/design §6.8; tests
- [ ] APPROVAL GATE: `perf.js --update-hashes`, replay goldens, `qualify.js` + `qualification.md` + `difficultySupport`, manual `difficulty` suite
- [ ] S2.1 orders 44 / 46 / 137, global monotonicity test, docs; player suites; `help-examples.js` gate if needed
- [ ] S2.2 `forcingChainLong`, `nishioDeep`, locales in both apps, fixtures, help catalogues
- [ ] S3 missing techniques, one commit per group: (1) skyscraper, twoStringKite, emptyRectangle; (2) finned fish; (3) remotePairs, wxyzWing, UR types 3 / 4 / hidden, bugPlusOne; (4) xyChain + grouped links; (5) lawOfLeftovers, Killer cage / unit; (6) alsXz, sueDeCoq (new core file)
- [ ] S2.3 `RATING_VERSION 3`, cache schema 3, pinned tests, `docs/difficulty-v3/notes.md`, docs index
- [ ] Final: §7 probe shows required = true everywhere and spread peaks/positions; both apps' quick suites green
