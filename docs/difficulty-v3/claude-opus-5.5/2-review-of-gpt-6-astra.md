# Rating v3: review of SA2's report (SA1, claude-opus-5.5)

Status: cross-review, 2026-11-12, of `docs/difficulty-v3/gpt-6-astra/1-report.md` (SA2) against my report
`docs/difficulty-v3/claude-opus-5.5/1-report.md` (SA1), the plan and the code at HEAD `6abcb9f` (branch
`rating-v3`). Read-only: no repository file was changed except this one. Conflicts were re-checked by reading the
code and with two small read-only probes run from `generator/` (no test suite was run): a floor-equivalence probe
(96 generated puzzles) and a registry count. "SA2 §n" and "SA1 §n" are sections of the two reports; "plan:n" is a
line of `docs/difficulty-v3/plan.md`.

---

## 1. Summary

The reports agree on almost every finding about the code and on most corrections. SA2 is stronger on contracts,
consumers and tooling (veryEasy, `pipeline.run` without `exact`, soak's exactness path, history, the help-example
tool, the technique soundness conditions); SA1 is stronger on measurements beyond classic9 Normal to Expert
(Master, Nightmare, Killer, Jigsaw, Greater-Than shallow rates; Nightmare chain lengths). This review adds one new
result that changes the S0.1/S1.1 design for the better: **`required` can be read off the rating itself**, with no
second solve, once orders are monotone in the weights (§2.2.1).

### 1.1 Agreement

- The §7 probe reproduces exactly (both); Hard does not hug the top (median band position 0.56, 3/24 in the top
  quarter), Expert does (median 0.86, 9/12) (SA2 #6, SA1 §2.1).
- All 24 Hard and 12 Expert samples already pass the floor check; 5 of 12 Normal samples do not (both).
- The constructed-fixture test of S0.1 is false for `constructed-normal-1`, `-3` and `constructed-nightmare-1..3`;
  the variant id is `killer`; the suite must be listed in `generator/tests.html` (SA2 #2, SA1 #4).
- The keeper computes the distance before the uniqueness count (`generator/js/engine/digger.js:1053`) and can keep a
  shallow candidate at distance 0 (SA2 #3, SA1 #5).
- `assumeUniqueness: true` is sound at every planned call site (SA2 §4 S1.1 table, SA1 §4 S0.1).
- `localSearchSteps` has no `level` variable: use `spec.level` (both).
- S1.2 terminates; its stopping rule can drop the tier; proposal digs must keep their own objective (SA2 #5, SA1 #6).
- Fixed weights leave the lower part of each band unattainable (`1.25 w + V`), so a uniform target is not a uniform
  outcome (SA2 #7, SA1 §4 S1.2).
- S2.1's orders 44 / 46 / 137 and the S3 orders including `forcingChainLong` 198 satisfy the invariant; the frozen
  fixture ladder of `core/tests/fixtures/techniques.js` must stay frozen and the expected registry order become a
  separate list (SA2 #8, SA1 #7).
- Every new id needs two positive and one negative real fixture position and a Player help example; the help file is
  `player/js/ui/help-examples.js`; `bugPlusOne` changes the uniqueness-technique test (SA2 #9, #10; SA1 #8).
- `generator/tests/replay-fixtures.js` regenerates only the wire snapshots, not the 14 golden analyses (both).
- `cageLocked` is not needed: `cageCombo` already does the cage-to-unit elimination and the killer pair (both; SA2
  also probed it).
- The Killer and Greater-Than suites named "quick" by the plan are manual (`generator/tests/manual/`) (both).
- Nishio's default depth is 2, ceiling 3 (both).

### 1.2 Disagreements (details in §2.2; owner questions in §3)

| # | Topic | SA2 | SA1 (position after this review) |
|---|---|---|---|
| D1 | How `required` is obtained | a separate floor solve with a deterministic cap and an `unverified` status (SA2-Q-S02) | derive it from the rating's `techniqueCounts`; keep `certifyFloor` as the reference (new, §2.2.1) |
| D2 | Step order | plan order: S1 before S2.1 | S2.1 before S1 (the derivation and the S1.2 steering need monotone orders); unchanged |
| D3 | Chain window | accepts the plan's <= 6 / 7-12 (its question is about Nishio depth) | <= 4 / 5-12, from the Nightmare data (SA1-Q-S1); unchanged |
| D4 | Target beyond the guided stage | carry it into refine and local search (SA2-Q-S03 b) | guided stage first, extend only if Expert still hugs the top (SA1-Q-S4 b); unchanged |
| D5 | Regression hashes (GG) | update in every output-changing task | SA1 consolidated them; **SA1 was wrong**: the quick smoke suite checks a hash sample (§2.3) |
| D6 | First qualification run | after S1.2 (GQ-S1) | after S2.2: before it, Nightmare's tier is only `nishio`, so a qualification would drop Nightmare and Hell 1 for a reason S2.2 removes; unchanged |
| D7 | History marker | needs a stored version and truthful wording (SA2-Q-S07) | **SA2 is right**; SA1-Q-S6 corrected (E5) |
| D8 | VeryEasy tier | the plan's code and test contradict each other (SA2 #1) | **SA2 is right**; SA1 had special-cased it (E1) |
| D9 | Owner-question scope | Q-S01, Q-S02, Q-S08 to Q-S11 are owner questions | plan-author or implementer matters (§3) |
| D10 | Effort | 118-187 engineering hours | 43-67 agent hours in SA1; raised to 55-85 (§4.4); different units |

### 1.3 Found by SA2, missed by SA1 (all verified)

- VeryEasy: the plan's code gives `tier(veryEasy) = allowed - [] =` the three singles and `floorLevel =
  LEVELS[-1]` (undefined), while its test wants an empty, vacuous tier (plan:164-166 against plan:200-201).
- `isExact` counts a missing certificate as exact (plan:242-248).
- `SG.pipeline.run` returns no `exact` (`generator/js/engine/pipeline.js:234-245`; only the done event carries it,
  249): the S1.1 acceptance test (plan:296) must read the done event or `SG.digger.generate(...).exact`. (SA1's
  probes used `pipeline.run(...).exact` only for a count that the report never used.)
- `soak.js` rebuilds exactness on its pipeline path as `rating.level === combo.level` (`generator/tests/soak.js:226`)
  and defaults to 500 puzzles (`generator/tests/soak.js:71`).
- The plan's shallow rate counts over exact puzzles (plan:222), which is zero by construction after S1.1; report it
  over in-band puzzles.
- `keeper.closer` prefilters by the pre-certification distance (`generator/js/engine/digger.js:1047-1049`), called at
  `digger.js:1463` and `generator/js/variants/killer.js:907`.
- `warningModels` passes no arguments to `t(key)` (`generator/js/ui/result-view.js:63`): a `{level}` placeholder in
  `difficulty.shallow` would stay unfilled.
- History entries store `variantId, requested, level, seed, clues, score` and the configuration, no version
  (`generator/js/ui/history.js:21-22, 60-80`); picking one regenerates by seed with the current engine. After v3 an
  old entry's stored level and score describe a puzzle the app no longer makes.
- The help-example tool generates thousands of puzzles before `--puzzles` truncates stage 2
  (`player/tests/tools/make-technique-examples.js:31-42, 243`), writes its stage file to `os.tmpdir()` (238) and
  writes LF output (227-228). `player/js/ui/help-examples.js` is LF in the index and CRLF in the working tree, with
  `core.autocrlf=true` and `core.safecrlf=true`: an LF rewrite can be refused at `git add`. The tool needs adapting
  before the first GH gate.
- `generator/design.md` §14.1 is the puzzle JSON schema (`generator/design.md:1754`); "Known limitations and ideas"
  is an unnumbered section at 2004 (plan:134, 443, 484 point to §14.1).
- More pinned orders: `core/tests/suites/tech-fish.test.js:676-687` (jellyfish 160), `generator/tests/manual/
  killer.test.js:511, 525`, `generator/tests/manual/greater-than.test.js:417-424`.
- `buildChainFinding` hard-codes `technique: 'forcingChain'` (`core/js/engine/tech-chain.js:380`); a
  `forcingChainLong` finder that reuses it fails `solver.invalidFinding`. The chain option tests
  (`core/tests/suites/tech-chain.test.js:818-920`) need an internal general search seam.
- `tech-subset.js` keeps a module-level `nodes` counter (`core/js/engine/tech-subset.js:48, 136`) that spaces
  `ctx.check()`, and `check()` counts toward a node budget (`core/js/engine/budget.js:57-64`). Generation itself uses
  no node budget (only `replay.js`, the jigsaw layout solver and `model.js` create one), so this matters only if a
  deterministic node cap is added for floor solves, which D1 makes unnecessary.
- The final count is 40 techniques (26 registered today, 21 unscoped, plus 2 split ids and 12 S3 ids), 34 unscoped
  (verified with `SG.techniques.list()`).
- Precise soundness conditions for the S3 patterns (SA2 §4 S3): remote pairs by edge parity, WXYZ restricted digits,
  UR type 3/4/hidden, BUG+1 with the global bivalue invariant, XY-chain edge types, grouped-node representation and
  its consumers (`player/js/ui/play.js:226-245`, both `formatChains`), law of leftovers as a multiset, ALS-XZ and Sue
  de Coq count proofs. SA1's S3 table was coarser.
- The plan's S1.2 test "6 fixed Hard seeds, not all in the top quarter" already passes at HEAD (3/24 in the top
  quarter), so it does not test the change; test the comparator through a pure seam.

### 1.4 Found by SA1, missed by SA2

- Shallow rates beyond classic9 Normal to Expert: Master 4/12, **Nightmare 12/12**, Killer Normal 4/6, Hard 6/6,
  Expert 6/6, Jigsaw9 Expert 4/6, Greater-Than Hard 2/6 (SA1 §2.2): S1.1 changes more than classic9.
- Nightmare chain lengths: the longest chain per sampled puzzle is 5, 5, 5, 4, 3, 6, 4, 4, 4, 5, 3, 5 links, so the
  plan's window keeps all 12 shallow (D3).
- Easy changes meaning: today an Easy puzzle can be singles-only (the three constructed Easy fixtures score 46 with
  singles only); under "required" Easy needs pointing, box/line or a naked pair (SA1-Q-S2).
- The S1.2 steering signal "a tier technique was used" equals "required" only with monotone orders, hence S2.1 first
  (SA1 §4 S1.1); this review extends it to the certificate itself (§2.2.1).
- The local search needs a bound once the band is reached (`SHALLOW_SEARCH_RATINGS`), or levels where "required" is
  rare burn the attempt caps (`CAP_RATINGS` 1,024, `CAP_PROPOSALS` 32,768, `generator/js/engine/digger.js:630-631`).
- `tune.miss` reads "wanted Hard, got Hard" for an in-band shallow sample (`generator/js/ui/locale.en.js:513`): use a
  new `tune.shallow` key.
- The plan's comment "master's floor would lose Unique Rectangle" means Nightmare's floor.
- `steps.test.js:879-889` pins scores that move with every output change.
- An intermediate qualification after S1 alone would wrongly drop Nightmare and Hell 1 (D6).

---

## 2. Claim-by-claim review of SA2's findings

### 2.1 SA2 §0, the ten top issues

| SA2 # | Claim | Verdict | Evidence and note |
|---|---|---|---|
| 1 | VeryEasy tier contradicts code and tests; undefined floor level | agree | plan:164-166 versus 200-201; resolution in §3 (implementer-level, no behaviour change) |
| 2 | Constructed-fixture floor test false; `label`, not `level`; old certificates are family sets | agree | same five entries as SA1; `generator/tests/fixtures/rated.js:103-179` |
| 3 | Keeper retains shallow puzzles at distance 0; `closer` prefilters too | agree | SA1 missed the `closer` call sites (`digger.js:1463`, `killer.js:907`); with the derived certificate (§2.2.1) the first distance computed is already final, so `offer` and `closer` are correct by construction |
| 4 | Missing certification must not mean exact; contradiction and budget exhaustion are not proofs | agree | with the derived certificate a rated puzzle always has one; `contradiction` makes `rating.solved` false anyway |
| 5 | S1.2 terminates; stop rule can downgrade a tier state; target must not apply to proposal digs | agree | same as SA1 |
| 6 | Hard does not hug the top; Expert does; Hard and Expert pass the floor; 5/12 Normal fail | agree | identical numbers |
| 7 | Fixed weights prevent uniform band coverage (xyWing >= 812.5; nishioDeep >= 3,250 in [2,400, 3,600)) | agree | SA1: Hard targets in [400, 446) unreachable |
| 8 | S2.1 orders consistent with S3 (198); more pins than the plan lists | agree | SA2's extra pins verified (§1.3) |
| 9 | S3 is a major project; grouped nodes need a new representation | agree | SA2's contracts adopted for the task packs |
| 10 | Integration instructions wrong (Killer patterns exist, manual suites, help path, wire-only updater, §14.1) | agree | §14.1 is new to SA1 |

### 2.2 Re-checks of the conflicting points

#### 2.2.1 `required` from the rating itself (D1, new)

The solver rescans its ladder from the first technique after every step and applies the first technique that finds
something (`core/js/engine/logical-solver.js:246-269`). `rate()` solves with every technique and
`assumeUniqueness: true` (`generator/js/engine/difficulty.js:442-449`), the same flags `certifyFloor` uses
(plan:181). When the floor techniques form a prefix of the rating ladder, which is exactly the S2.1 invariant, the
restricted solve follows the full solve step by step until the first step at which the full solve applies a
non-floor technique; at that state every floor technique has just returned nothing, so the restricted solve is stuck
there. Hence, for a rating computed by `rate()`:

```text
required(rating, level) = rating.solved
  && some id with rating.techniqueCounts[id] > 0 is not in floorTechniques(level)
```

For an in-band rating no technique above the level's allowed set can appear (a technique of weight w adds at least
1.25 w to the score), so this is "the rating used a tier technique". `rating.techniqueCounts` exists on every rating
(`generator/js/engine/difficulty.js:394, 403`).

Probe (scratch, read-only, at HEAD, before S2.1): for classic9 Normal, Hard, Expert, Master, Nightmare (12 seeds
each) and Killer, Jigsaw9, Greater-Than Normal, Hard, Expert (4 seeds each), the derived value equalled the floor
solve in **96 of 96** cases (61 s). At HEAD a mismatch is possible only where an order inversion straddles a tier
edge (`jellyfish` after `xyWing`); after S2.1 the equality is exact.

What it changes for the task packs (outcomes are identical):

- No second solve per candidate; no floor budget, no `unverified` status, no cap (SA2-Q-S02 becomes unnecessary);
  no new determinism exposure through `tech-subset.js`'s counter.
- `ensureFloor` and its idempotency rules disappear from the digger; `isExact(rating, level)` becomes a pure
  function of the rating; the keeper's first distance is final (`distanceToLevel + 0.5` for in-band shallow).
- The uniqueness contract is the rating's own, which every caller already relies on today.
- `certifyFloor` stays, as specified, for tests, soak, tools and ratings made differently (non-default solver
  options, `replay.js` budgets); a quick test asserts `required(rating) === certifyFloor(...).required` over the
  constructed fixtures and a few generated puzzles per level, and the global order invariant test guards the
  precondition for every variant.

This is a mechanism change inside a fixed decision, so it needs the plan author's agreement, not the owner's.

#### 2.2.2 Step order (D2)

The plan runs S1 before S2.1. With S1 first, the S1.2 steering signal (`tierUsed`) and the derived certificate are
not exact until S2.1 lands, and every golden, hash and help example recorded in S1 is recorded again in S2.1
(Killer paths change with `cageCombo` before `boxLine`). With S2.1 first both problems vanish and S2.1 is small.
SA1 keeps S0.1, S0.2, S2.1, S1.1, S1.2, S2.2, S3, S2.3.

#### 2.2.3 Chain window (D3)

SA2-Q-S04 keeps the plan's <= 6 / 7-12 and asks about Nishio depth. The SA1 data (12 Nightmare puzzles, longest
chain per puzzle 5, 5, 5, 4, 3, 6, 4, 4, 4, 5, 3, 5; the window applies to `best.length`,
`core/js/engine/tech-chain.js:385`, the same quantity) give:

| Window (forcingChain / forcingChainLong) | Sampled Nightmare puzzles that need the long id | Master chains (3, 4, 4) stay Master |
|---|---|---|
| <= 6 / 7-12 (plan) | 0 of 12 | yes |
| <= 5 / 6-12 | 1 of 12 | yes |
| <= 4 / 5-12 (SA1) | 6 of 12 | yes |

The plan's window is likely to make Nightmare (and Hell 1, which needs `nishioDeep`) fail qualification on most
variants. SA1 keeps (b) <= 4 / 5-12, to be confirmed by the S0.2 chain-length histogram. On Nishio depth SA1 agrees
with SA2 (b): `nishioDeep` covers depth 2 by default, depth 3 only with the explicit option (SA1 §4 S2.2 said the
same).

#### 2.2.4 Target beyond the guided stage (D4)

SA2's argument for (b) is real: `refineDown` reveals clues from above the band and stops at the first in-band state,
which lands near the top edge; Expert's median band position is 0.86. SA1's argument for starting without it: it
adds up to `REFINE_RATINGS` (64) ratings per proposal and changes the local-search objective, and the guided-stage
target may already move most samples. Owner question (merged M-S4) with SA1's recommendation: guided stage first;
re-measure the band positions after S1.2 (bounded soak sample); extend the target to `refineDown` and local search in
the same task if Expert's median position stays above 0.75.

#### 2.2.5 Gates (D5, D6)

`generator/tests/suites/smoke.test.js:17-19, 60-64` (quick) checks the regression hashes of 11 low-level cells
(classic9 veryEasy/easy/normal, killer/easy, jigsaw9/normal and others) written by `node tests/perf.js
--update-hashes` (`generator/tests/perf.js:19, 42`). S1.1 changes Easy and Normal outputs and S2.1 changes Killer
paths, so GG belongs to every task that changes those outputs, as SA2 assigns it; SA1's R14 was wrong on this point
(E3). Qualification (about 25 minutes) stays consolidated: once after S2.2 and once at the end (D6).

### 2.3 SA2 §1-§6, other claims

| SA2 claim | Verdict | Note |
|---|---|---|
| §1.1 CI uses Node 24, the baseline ran on 26 | agree | record both in the task packs; quick sets must pass on 24 in CI |
| §1.2 `pipeline.run` has no `exact` | agree | `generator/js/engine/pipeline.js:234-245` |
| §1.3 constructed floor table | agree | same as SA1 |
| §2.2 tier table and order/weight list | agree | VeryEasy row is the plan contradiction; WXYZ-Wing is Master (1.25 x 800 = 1,000, not < 1,000) |
| §2.2 "test adjacent registry weights with `<=`" | agree | registry ties use baseCost then id (`core/js/engine/techniques.js:148-153`) |
| §3.1 raw dig log ops are `accept`, `reject`, `keep`, `pass`, `reveal` | agree | the plan's `{op: 'remove' / 'reveal'}` describes the replay moves |
| §3.1 harness is global `describe` / `it` / `expect` | agree | the plan's `SG.test.describe/it/assert` does not exist |
| §3.2 eight source lists plus both `CORE_SUITE_FILES` for a new core suite | agree | `ui-contract` checks list parity in the quick run |
| §3.2 `cache.js:277-284` compares grids and score/level only | not re-checked | plausible; assign to the version task |
| §4 S0.1 `FloorCertificate` with `status` and `unverified` | superseded | by §2.2.1: `{ level, floorLevel, required, vacuous }` suffices; `certifyFloor` keeps `unsolvedCount` for tests |
| §4 S0.1 do not call `spec(previousLevel)` (can throw) | agree | derive the floor by global level index, independent of offered levels |
| §4 S0.2 report shallow share over in-band puzzles; specify `--count` | agree | gate command in §4.2 |
| §4 S1.1 keeper: precheck only when strictly worse; never store a pre-certification distance | agree | automatic with §2.2.1 |
| §4 S1.1 discriminated objective result (`bounded` / `proposal`) | agree | removes the plan's mixed number/object comparator |
| §4 S1.1 events: `required` boolean-or-null | partly | with §2.2.1 it is never null; SA1 prefers a separate `tune.shallow` key over an argument on `tune.miss` |
| §4 S1.2 draw the target once per sample with `rng.fork('target')` | agree | `generator/js/engine/rng.js:77-79` |
| §4 S1.2 Killer protects layout clues; Greater-Than has no guided stage | agree | do not promise uniform targets there |
| §4 S2.1 keep historical `after` arrays, add a current registry list | agree | same as SA1 |
| §4 S2.2 shortest-proof rule; length = max of the two path lengths; all three step subkeys | agree | `core/tests/suites/tech-chain.test.js:124-154` |
| §4 S3 common acceptance contract (read-only state, deterministic Finding, complete units, budget propagation) | agree | include it verbatim in every S3 task pack |
| §4 S3 positive baseCosts for new ids | agree, implementer | baseCost does not change the v3 score (`emptiesOf` subtracts the same baseCost terms, `generator/js/engine/difficulty.js:373-381`) but orders `hardestTechnique` in the solver report (`core/js/engine/logical-solver.js:285`); choose values increasing with weight |
| §4 S3 group 4: a bounded chain search is not complete for 3D Medusa / AIC | agree | document as "some eliminations found within the bounded search" |
| §4 S2.3 release v3 atomically | agree | the branch merges once; intermediate commits stay quick-green |
| §5.1 implementer corrections | agree | except the counter reset, needed only with a node cap (§1.3) |
| §6 one developer per repository; ownership as serial lease | agree | |
| §6.2 GH needs tool engineering first | agree | a separate tooling task (§4.2, S-03) |
| §7 risks | agree | add SA1's: Nightmare/Hell 1 reachability, Easy meaning change, keeper-caps burn |

---

## 3. Owner questions

### 3.1 SA2's questions against SA1's

| SA2 question | Overlap with SA1 | SA1 position |
|---|---|---|
| SA2-Q-S01 VeryEasy contract | none (SA1 missed it) | not an owner question (no behaviour change): (a) tier = the real set difference (the three singles), certificate vacuous for level index 0, `floorLevel: null`; plan author to confirm |
| SA2-Q-S02 floor cap and unknown outcome | none | unnecessary with the derived certificate (§2.2.1); if a separate floor solve is kept, use no new cap (the floor solve does at most the rating's work) |
| SA2-Q-S03 target beyond the guided stage | SA1-Q-S4 | conflict; owner (M-S4) |
| SA2-Q-S04 chain window and Nishio depth | SA1-Q-S1 | merge; conflict on the window, agreement on depth (M-S1) |
| SA2-Q-S05 bounded coverage of expensive patterns | none | agree it is needed and (a): documented limits with deterministic guards; owner or plan author (M-S7) |
| SA2-Q-S06 shallow warnings | SA1-Q-S3 | agree (a): keep `difficulty.approximate`, add `difficulty.shallow` (M-S3) |
| SA2-Q-S07 floor persistence and history marker | SA1-Q-S6 | merge (M-S6); SA2's version is right |
| SA2-Q-S08 baseCosts and ALS group | SA1 R12 (`chain`) | implementer / plan author: positive baseCosts increasing with weight; group `chain` |
| SA2-Q-S09 group 5 Killer meaning | SA1 R11 | implementer: the plan itself delegates the check ("check first whether cageCombo already does both"); no `cageLocked`, add a quick regression |
| SA2-Q-S10 reference-puzzle labels | none | implementer: keep v2 labels and certificates as history, add v3 expectations |
| SA2-Q-S11 help-example acquisition | none | implementer (a) curated real puzzles; escalate to the owner only for an id that has no real example |

### 3.2 Questions missing from SA2's list

- SA1-Q-S2 (Easy must need pointing, box/line or a naked pair): a visible change of Easy; SA2 has no counterpart.
- SA1-Q-S5 (levels that may stop being offered): SA2 touches it only in its risks.

Missing from both reports: what old history entries do after v3 (they regenerate a different puzzle); added to M-S6.

### 3.3 Merged question list proposed for `clarifications.md`

| Merged id | Sources | Question | SA1 recommendation |
|---|---|---|---|
| M-S1 | SA1-Q-S1 + SA2-Q-S04 | Chain window and `nishioDeep` depth | <= 4 / 5-12, confirmed by the S0.2 histogram; depth 2 by default (SA2: <= 6 / 7-12; depth 2) |
| M-S2 | SA1-Q-S2 | Easy must need pointing, box/line or a naked pair | yes |
| M-S3 | SA1-Q-S3 + SA2-Q-S06 | Shallow result presentation | both warnings plus `tune.shallow` (agreed) |
| M-S4 | SA1-Q-S4 + SA2-Q-S03 | Target in `refineDown` and local search | guided stage first, extend if Expert median > 0.75 (SA2: extend now) |
| M-S5 | SA1-Q-S5 | Accept the levels qualification drops | yes, record in `notes.md` |
| M-S6 | SA1-Q-S6 + SA2-Q-S07 | Old history entries and floor export | store a rating version in new entries; old entries say "made by an earlier version: picking it makes a new puzzle"; floor not exported |
| M-S7 | SA2-Q-S05 | Limits of the expensive new patterns (ALS size, leftovers set size, grouped nodes) | documented limits chosen from bounded measurements |

Not for the owner (plan author or implementer): SA2-Q-S01, SA2-Q-S02, SA2-Q-S08 to SA2-Q-S11, and the derived
certificate (§2.2.1).

---

## 4. Task breakdown

### 4.1 Comparison

| Aspect | SA2 (SV3-01..18) | SA1 (ST1..ST13) | Merged |
|---|---|---|---|
| Order | S0.1, S0.2, S1.1, S1.2, S2.1, S2.2, S3, S2.3, final | S0.1, S0.2, S2.1, S1.1, S1.2, S2.2, S3, S2.3 + final | SA1's order (D2) |
| Floor mechanism | separate solve, cap, `unverified` | separate solve | derived certificate (§2.2.1) |
| Tooling | golden recorder inside SV3-04; example tool adapted "before use" | not separated | one tooling task before the first output change |
| S3 | ten tasks | six tasks | SA2's ten |
| Final evidence | separate task SV3-18 | inside ST13 | separate task |
| GG / GR / GH | every output-changing task | consolidated (wrong for GG) | every output-changing task |
| Qualification | after S1.2 and final | after S2.2 and final | after S2.2 and final |

### 4.2 Merged breakdown (one developer, sequential)

Every task ends with both quick sets green (`cd generator && node tests/node-runner.js`, `cd player && node
tests/node-runner.js`) and one commit. Generated files follow `.gitattributes` before `git add` (CRLF in the
working tree, except `player/tests/fixtures/exports/*.txt` and `.github/scripts/*.sh`, which stay LF). "Integration
bundle" is SA2's list (SA2 §6.1): the weights table, `core/tests/fixtures/techniques.js`,
`core/tests/suites/techniques.test.js`, `generator/tests/suites/technique-weights.test.js`,
`generator/tests/fixtures/rated.js`, the four locale files, both `help.js`, both help tests,
`player/js/ui/help-examples.js`, both `design.md`, the four guides; a task edits only the members whose facts
change.

Gate commands (pre-approved; the task's developer runs and records them): GG = `node tests/perf.js --update-hashes`
then `--check-hashes`; GR = `node tests/replay-fixtures.js` then `--check`, plus the golden-analysis recorder of S-03;
GH = the adapted help-example tool from `player/`, then the Player help test; GD = `node tests/node-runner.js
--suite=difficulty` (and `--suite=killer,greater-than` when their pins change); GS = `node tests/soak.js --quick
--no-gate` (split by `--variant` if it exceeds 10 minutes); GQ = `node tests/qualify.js --variant=<ids>
--level=<ids> --json=<file> --markdown=<file>` in batches, output under `docs/difficulty-v3/`; GP = `node
tests/perf.js --gate` in shards. All from `generator/` unless stated.

| Id | Title and scope | Depends on | Files owned (exclusive while active) | Gates | Size |
|---|---|---|---|---|---|
| S-01 | Tier sets and floor certificate (S0.1): `allowedFor`, `floorTechniques`, `tierTechniques`, `certifyFloor`, derived `requiredOf(rating, level, model)`, VeryEasy rule, equivalence test | - | `generator/js/engine/difficulty.js`, `generator/tests/suites/difficulty-floor.test.js` (new), `generator/tests.html`, `generator/design.md` §6.7, §13.7, `DEVELOPERGUIDE.md`, `DEVELOPERGUIDE.vn.md` | - | M |
| S-02 | Soak columns and baseline (S0.2): peak histogram, band-position deciles, chain-length histogram, in-band shallow share | S-01 | `generator/tests/soak.js`, `docs/difficulty-v3/baseline.md` (new) | GS (before) | M |
| S-03 | Tooling: golden-analysis recorder/checker for `replay-goldens.js`; help-example tool with a project-relative stage file, CRLF output, bounded id/puzzle selection, jigsaw support | S-02 (file-disjoint; could run in a second clone) | `generator/tests/replay-fixtures.js` or a new recorder under `generator/tests/`, `player/tests/tools/make-technique-examples.js` | both tools in check mode, no diff at HEAD | M |
| S-04 | Orders monotone in the weights (S2.1) | S-03 | `core/js/engine/tech-cage.js`, `core/js/engine/tech-ineq.js`, `core/js/engine/tech-fish.js` (orders only), pinned tests (core, manual), registry-order list, integration bundle | GG, GR, GH, GD | M |
| S-05 | Exact means required (S1.1): `isExact` from the derived certificate, keeper and `closer`, local search with `spec.level` and a bound, refine, early stops, `pipeline.run` returns `exact`, soak and qualify consumers, `tune.shallow`, `difficulty.shallow` with arguments | S-04; M-S2, M-S3 | `generator/js/engine/digger.js`, `generator/js/variants/killer.js` (`closer` call), `generator/js/engine/pipeline.js`, `generator/js/engine/events.js`, `generator/js/ui/result-view.js`, `generator/js/ui/app.js`, generator locales, `generator/tests/soak.js` (exactness path), digger, events, result-view and steps tests | GG, GR | L |
| S-06 | Band target (S1.2): target draw, discriminated objective, comparator seam, fixed stop rule, proposal digs excluded, refine/local per M-S4; texts | S-05; M-S4 | `generator/js/engine/digger.js`, generator locales, `generator/js/ui/help.js`, `generator/design.md` §6.8, guides, digger tests | GG, GR; bounded soak sample for band positions | L |
| S-07 | Chain ids (S2.2): wrappers with windows per M-S1, technique id parameter, internal general seam, fixtures, locales, help | S-06; M-S1 | `core/js/engine/tech-chain.js`, `core/tests/suites/tech-chain.test.js`, integration bundle | GG, GR, GH; GQ (first consolidated), GD | L |
| S-08 | S3 group 1a: skyscraper, two-string kite | S-07 | `core/js/engine/tech-fish.js`, `core/tests/suites/tech-fish.test.js`, integration bundle | GG, GR, GH | M-L |
| S-09 | S3 group 1b: empty rectangle (grouped proof, transposes) | S-08 | same as S-08 | GG, GR, GH | M |
| S-10 | S3 group 2: finned X-Wing and Swordfish, sashimi | S-09 | same as S-08 | GG, GR, GH | L |
| S-11 | S3 group 3a: remote pairs, WXYZ-Wing | S-10; M-S7 | `core/js/engine/tech-wing.js`, `core/tests/suites/tech-wing.test.js`, integration bundle | GG, GR, GH | L |
| S-12 | S3 group 3b: UR type 3, 4, hidden; BUG+1 (`assumesUniqueness`) | S-11 | same as S-11, `core/tests/suites/techniques.test.js` (uniqueness list) | GG, GR, GH | L |
| S-13 | S3 group 4a: XY-chain | S-12 | `core/js/engine/tech-chain.js`, chain tests, integration bundle | GG, GR, GH | M-L |
| S-14 | S3 group 4b: grouped nodes and links, proof representation, consumers | S-13; M-S7 | `core/js/engine/tech-chain.js`, chain tests and proof checker, `generator/js/ui/i18n.js`, `player/js/ui/i18n.js`, `player/js/ui/play.js`, integration bundle | GG, GR, GH; GP shard for chain cost | L (split if over 1,600 lines) |
| S-15 | S3 group 5: law of leftovers (`jigsaw9`), Killer interaction regression | S-14; M-S7 | `core/js/engine/tech-subset.js`, its tests, a focused cage test, integration bundle | GG, GR, GH, GD (killer) | L |
| S-16 | S3 group 6a: ALS enumerator and ALS-XZ | S-15; M-S7 | `core/js/engine/tech-als.js` (new), `core/tests/suites/tech-als.test.js` (new), the eight source lists and both `CORE_SUITE_FILES`, integration bundle | GG, GR, GH; GP shard | L |
| S-17 | S3 group 6b: Sue de Coq; `forcingChainLong` order 198 | S-16 | `core/js/engine/tech-als.js`, `core/js/engine/tech-chain.js` (order), ALS tests, integration bundle | GG, GR, GH | L |
| S-18 | Version 3 (S2.3): `RATING_VERSION` 3, cache schema 3 and regeneration equality, history version field and note per M-S6, pinned version tests, notes, docs index, limitations section | S-17; M-S6 | `generator/js/engine/difficulty.js` (version), `generator/js/ui/cache.js`, `generator/js/ui/history.js`, `generator/js/ui/export.js` (only if needed), generator locales, `generator/tests/manual/difficulty.test.js` (version pins), `docs/difficulty-v3/notes.md` (new), `docs/README.md`, design and guides | GG, GR, GH, GD | M |
| S-19 | Final evidence: soak after, qualification of every offered pair, performance gate, support lists per M-S5 | S-18; M-S5 | `docs/difficulty-v3/qualification.md` (new), variant `difficultySupport` lists, living docs links | GS (after), GQ (final), GP, GD | M plus long runs |

```
S-01 -> S-02 -> S-03 -> S-04 -> S-05 -> S-06 -> S-07 -> S-08 -> ... -> S-17 -> S-18 -> S-19
```

Parallelism: none inside the repository except S-03, which is file-disjoint from S-01 and S-02 and could run in a
second clone. The fish, wing, chain and ALS groups are conceptually independent but share the integration bundle,
the help examples and the hashes. The whole chain runs in parallel with the Pentomino chain.

### 4.3 Merged implementer resolutions (beyond SA1 §5.1 and SA2 §5.1)

- VeryEasy: the tier is the real set difference; certification is vacuous for level index 0.
- `required` is derived from the rating (§2.2.1); `certifyFloor` is the reference and the equivalence is tested.
- `pipeline.run` returns `exact` (the done event already has it); soak and qualification read it.
- Shallow share is reported over in-band puzzles.
- Generated files (`help-examples.js`, regression and replay fixtures) are CRLF in the working tree before staging;
  the LF exceptions of `.gitattributes` stay LF.
- The "known limitations" facts go to `generator/design.md` "Known limitations and ideas" (line 2004), not §14.1.
- New ids get positive baseCosts increasing with weight; ALS ids use group `chain`.

### 4.4 Effort

SA2 estimates 118-187 engineering hours; SA1 estimated 43-67 hours of developer-agent time. After this review SA1
raises its estimate to 55-85 agent hours (tooling task, ten S3 tasks, real fixture and help-example discovery,
grouped-node consumers), plus the long gate runs (qualification about 25 minutes per full pass, soak, performance).
The derived certificate removes some S1.1 work. The joint report should give agent hours per task and list the
long runs separately.

---

## 5. Errata to SA1's report

| Id | SA1 text | Correction |
|---|---|---|
| E1 | §2.2 "veryEasy vacuous"; §4 S0.1 test (2) "the veryEasy tier is empty and vacuous" | the plan's code gives the three singles as veryEasy's tier and an undefined `floorLevel`; resolution in §4.3 (SA1's probe had special-cased index 0) |
| E2 | §4 S0.1 "Correct" and the `certifyFloor` call-site analysis | still sound, but the digger should use the derived certificate (§2.2.1); `certifyFloor` becomes the reference |
| E3 | §5.1 R14 "run ... `perf.js --update-hashes` ... once after S2.2 and once at the end" | the quick smoke suite checks a hash sample (`generator/tests/suites/smoke.test.js:17-19, 60-64`): GG belongs to every output-changing task |
| E4 | §4 S0.2 gate `node tests/soak.js --quick --no-gate` | unchanged, but the shallow share must be reported over in-band puzzles, and the pipeline path's exactness (`generator/tests/soak.js:226`) is fixed in S1.1 |
| E5 | §5.2 SA1-Q-S6 "marker in the result view for entries with `ratingVersion < 3`" | history entries hold no version (`generator/js/ui/history.js:21-22`); the marker needs a stored version, and entries without one must say "earlier version", not "v2" (M-S6) |
| E6 | §4 S1.1 keeper fix "call `ensureFloor`, then recompute the distance" | also the `closer` prefilters (`digger.js:1463`, `killer.js:907`); with the derived certificate the first distance is final |
| E7 | §4 S1.2 test "6 fixed seeds at hard, not all in [625, 700) is deterministic; record the seeds" | it already passes at HEAD and tests nothing; test the comparator through a pure seam with scripted objectives |
| E8 | §4 S2.3 "As planned" | the plan's §14.1 reference is the JSON schema section; "Known limitations and ideas" is at `generator/design.md:2004` |
| E9 | §6 ST1-ST13 | replaced by §4.2 (S-01..S-19): tooling task added, S3 split as SA2, final evidence separate |
