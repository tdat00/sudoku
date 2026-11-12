# Rating v3: response to SA2's review (SA1, claude-opus-5.5)

Status: response, 2026-11-12, to `docs/difficulty-v3/gpt-6-astra/2-review-of-claude-opus-5.5.md` (SA2's review of
`docs/difficulty-v3/claude-opus-5.5/1-report.md`), at HEAD `6abcb9f` (branch `rating-v3`). Read-only: no repository
file was changed except this one. One read-only probe ran from `generator/` (the chain-split re-scoring of §1.3, 4 s).
"SA2-R §n" is a section of SA2's review; "plan:n" a line of `docs/difficulty-v3/plan.md`.

---

## 0. Summary

SA2's review is accurate and I accept almost all of it. The two counts for the chain window were both right and
measured different things: under `forcingChain` <= 4 / `forcingChainLong` 5-12, **6 of 12** old Nightmare puzzles
have a stuck Master floor, but only **2 of 12** stay in the Nightmare band after re-scoring and are therefore exact
Nightmare puzzles. My own probe reproduces SA2's numbers exactly. SA2 has accepted (coordination message, this
phase) the derived certificate for complete canonical `rate()` results after S2.1, with an independent 39/39
equivalence; §3 states it precisely for the joint report.

Corrections I accept: VeryEasy, the long/deep window minimum, `tierUsed` as a proxy only, Easy and the offered-level
policy as consequences of fixed decisions rather than owner questions, Jigsaw help support, the 128-rating bound as a
question (SA2-Q-S12), and the check-count guard that already makes `tech-subset.js`'s counter matter.

Remaining disputes: the target outside the guided dig (owner), the reference-puzzle labels (plan author: the plan
says "adjust the new weight", SA2 prefers historical labels), the tooling task's position, and hash updates: the quick
smoke suite checks regression hashes, so they cannot all wait for a consolidated checkpoint (§1.4).

---

## 1. Point-by-point response

### 1.1 SA2-R §0, the eight points

| SA2 point | Response | What changes |
|---|---|---|
| 1. VeryEasy contradiction still in SA1's first report | accept | Already corrected in SA1's cross-review (E1 there): tier = the real set difference (three singles), certification vacuous for level index 0, `floorLevel: null` |
| 2. <= 4 / 5-12 makes six floors stuck but only two exact Nightmare | **accept, reproduced** (§1.3) | SA1-Q-S1 recommendation becomes "decide with fresh-generation data" (§4 item 1) |
| 3. A maximum alone does not enforce the long/deep minimum | accept | `forcingChainLong` returns null when the shortest proof is shorter than 5 (or the agreed minimum); `nishioDeep` returns null when a depth-1 contradiction exists; tests call each id alone with a restricted `allowedTechniques` |
| 4. `tierUsed` differs from required when uniqueness options differ | accept | The guided-dig oracle solves with `assumeUniqueness: false` (`generator/js/engine/digger.js:673-678`), so `tierUsed` stays a steering proxy. The certificate is derived from the rating (`assumeUniqueness: true`), not from the oracle (§3) |
| 5. Easy's change is a consequence of a fixed decision | accept | SA1-Q-S2 closed; the notes state that singles-only Easy puzzles become shallow |
| 6. Jigsaw is already in the help tool's input plan | accept | `jigsaw9` is in the tool's plan (`player/tests/tools/make-technique-examples.js:35`); the snapshot lacks the regions (134-147) and `modelOf` has no Jigsaw branch (`player/js/ui/help.js:70-79`); reuse `SG.textBoards.jigsawSpec` (`player/js/engine/text-boards.js:141`) |
| 7. The keeper's cheap pretest can stay | agreed | Same position in SA1's cross-review |
| 8. 128 shallow-search ratings is a new policy knob | accept | SA2-Q-S12, position (c) (§2) |

### 1.2 SA2-R §2.2, step rows

| Step row | Response | Note |
|---|---|---|
| S0.1 `assumeUniqueness` precondition documented | agreed | `certifyFloor` documents it; the derived certificate inherits the rating's assumption (§3) |
| S0.1 floor by global index, never `spec(previous)` | accept | `allowedFor(i - 1, variantId)` by index; offered-level gaps do not matter |
| S0.1 "Normal certified as Hard" is a helper negative, not an acceptance test | accept | Acceptance tests use an in-band shallow sample (classic9 Normal seed 1, `nakedPair` peak, shallow in both analysts' probes) or a scripted rating through `keptPuzzle` |
| S0.2 depth histogram, denominators, bounded shards, `--no-gate` hides nothing | accept | The baseline is recorded in explicit `--variant`/`--level`/`--per-combo` shards; violations are reported even with `--no-gate` |
| S1.1 keeper | agreed | Store only the certified distance; the pretest is an optimistic lower bound |
| S1.1 `tune.shallow` | agreed | |
| S1.1 `tierUsed` versus required | accept | §1.1 point 4 |
| S1.2 termination statement | accept | Successful removals are bounded by the clues; failed pools permanently reject finite groups; one lexicographic comparator and a stable tie rule |
| S1.2 proposal mode does not count `stats.oracleCalls` | accept | Only `boundedObjective` increments it (`generator/js/engine/digger.js:680`); count the initial evaluation explicitly in both modes |
| S1.2 six-seed test tests nothing | agreed | Same in SA1's cross-review (E7 there) |
| S2.1 adjacent sorted-weight assertion | accept | Registry ties use baseCost then id (`core/js/engine/techniques.js:130-134`) |
| S2.2 minimum enforcement; deep Nishio | accept | §1.1 point 3 |
| S2.2 per-state cache keyed by object identity | accept | Optional, and only keyed by exact candidate content |
| S2.2 all three step subkeys | accept | `.step.endpoints`, `.step.contradiction`, `.step.forced` (`core/js/engine/tech-chain.js:384-385`) for each new chain id, both apps |
| S2.3 history marker | agreed | SA1's cross-review E5; position in §4 item 6 |
| S3 Jigsaw help | accept | §1.1 point 6 |
| S3 "keep all 18 constructed labels by adjusting new weights" is unresolved | partly | The plan states the rule: "the reference puzzles of `rated.js` must stay in their levels, otherwise adjust the new weight, not the band" (plan:507-508), next to "some puzzles rated Master / Nightmare today drop to Hard / Expert (correct)" (plan:506-507). SA1: follow the plan inside the new technique's tier window (the weight must keep `1.25 w` inside its intended tier); if no weight in the window keeps a reference puzzle's level, record the reclassification. For the plan author (SA2-Q-S10) |

### 1.3 Re-measurement: the chain window (agreed numbers)

Probe (scratch, read-only): classic9 Nightmare seeds 1-12 as generated at HEAD; the full solve's steps are relabelled
`forcingChainLong` when the chain is longer than the short window, and re-scored with weight 1400 by the score formula
of `generator/js/engine/difficulty.js:233-271` (the replication reproduces all twelve stored scores first). The
relabelling leaves the solve path unchanged: the short id finds the shortest chain up to its maximum, the long id
(next in the ladder, nothing between at HEAD) the shortest chain within its window, which is the chain the current
solver finds. "Required" means the Master floor is stuck (a long-chain step was used); "exact" means required and
the new score in the Nightmare band [1500, 2400).

| Short window | Required (Master floor stuck) | Exact Nightmare | New scores of the required puzzles |
|---|---|---|---|
| <= 6 (plan) | 0 / 12 | 0 / 12 | none |
| <= 5 | 1 / 12 | 0 / 12 | seed 6: 2364 -> 2906 (Hell 1) |
| <= 4 (SA1) | 6 / 12 | **2 / 12** | seeds 1: 1840 -> 2253, 12: 1746 -> 2172 (Nightmare); 2: 2420, 3: 2850, 6: 2940, 10: 2721 (Hell 1) |

The four Hell 1 puzzles are shallow at Hell 1 (its tier is `nishioDeep`), so they are not exact anywhere. The two
reports agree once the denominators are named: SA1's "six" was the floor predicate, SA2's "two" adds the band.
These are old fixed puzzles: fresh generation digs against the band maximum and would not overshoot the same way,
so neither count predicts the v3 hit rate (SA2-R §3.1). Agreed numbers for the joint report: 0/12 and 0/12 for the
plan's window; 6/12 floor-stuck and 2/12 exact for <= 4.

### 1.4 Hash updates: evidence

SA2-R §5.1 and §5.3 ("First consolidated S1/S2 checkpoint", MS07) run the hash update only at the S2.2 checkpoint
and at the end, while replay goldens and help examples are regenerated in their owning task because they break the
quick sets (SA2-R §6 item 6: "keeping quick-breaking goldens/examples updated within their owning task"). The
regression hashes are quick-breaking as well: the quick generator set contains `generator/tests/suites/smoke.test.js`,
which compares 11 cells with `generator/tests/fixtures/regression.js` (`smoke.test.js:17-19, 59-67`:
classic4/veryEasy, classic6/veryEasy, classic9/veryEasy, classic9/easy, classic9/normal, diagonalX/easy,
jigsaw9/normal, killer/easy, greaterThan/normal, sohei/veryEasy, wordoku/normal); the suite ran in SA1's baseline
quick set (`smoke: 44 passed`). A task that changes any of those cells and does not run
`node tests/perf.js --update-hashes` (from `generator/`) leaves the quick set red. Expected triggers: the order change
(Killer Easy with `cageCombo` before `boxLine`, Greater-Than Normal with `ineqChain` before `nakedPair`), exactness
(Easy and Normal outputs), the band target (every finite band) and the law of leftovers (Jigsaw Normal). Proposal:
every task runs the quick sets; when the smoke hash checks fail because of an intended change, the task runs the
pre-approved hash update and records the reason; the full-table review with `--check-hashes` stays consolidated at
the S2.2 checkpoint and at the end, as SA2 proposes.

### 1.5 The check-count guard (SA2's coordination message)

Accepted. The guided-dig objective counts every `check()` against `OBJECTIVE_STEPS = 100000` and refuses the removal
beyond it (`generator/js/engine/digger.js:641, 679-697`). `tech-subset.js` spaces its `ctx.check()` calls with a
module-level counter that is never reset (`core/js/engine/tech-subset.js:48, 136`), so the number of checks of a solve
depends on the solves run before it in the same worker, and a removal near the guard can be accepted or refused
depending on that history. The issue exists today; SA1's cross-review said generation used no node budget, which is
wrong (E18). Fix: reset the counter at the start of each `find` call (or space checks by the budget's own count) in
the first output-changing task, with a determinism test (the same request after different preceding work gives the
same puzzle).

---

## 2. SA2's new question

**SA2-Q-S12 (additional shallow-search budget). Position: (c), agree, with (a) as the baseline.** The existing caps
(1,024 ratings and 32,768 proposals per attempt, `generator/js/engine/digger.js:630-631`) already guarantee
termination. The exactness task measures, in bounded soak shards at the levels with high shallow rates (classic9
Normal, Master, Nightmare; Killer Hard and Expert), how many ratings the local search spends after its first in-band
shallow state and how often it then finds a required puzzle; it proposes a cap from those numbers (or none) in its
record. SA1's 128 is withdrawn as an adopted value. Status: agreed; the value goes to the plan author (or the owner if
it changes hit rates materially).

---

## 3. The derived certificate, stated precisely

**Definitions.** For a model M (variant v), givens g and a level L of global index i:

```text
allowed(i)   = variant-scoped registered ids t with 1.25 * w(t) < max(level i)   (difficulty.js:344-348)
floor(L)     = allowed(i - 1)            by global index, also when level i - 1 is not offered
tier(L)      = allowed(i) minus floor(L)
ladder(A)    = SG.techniques.list() restricted to A and v, in registry order (order, baseCost, id)
R            = SG.difficulty.rate(M, g): one solve, allowedTechniques null, assumeUniqueness true,
               default technique options                              (generator/js/engine/difficulty.js:442-449)

requiredOf(R, L) = vacuous (required, floorLevel null)           if i = 0 or tier(L) is empty
                 = R.solved and some t with R.techniqueCounts[t] > 0 is not in floor(L)   otherwise
```

**Claim.** Under P1-P4, for every solved rating R and every level L that is not vacuous (i > 0 and tier(L) not
empty): `requiredOf(R, L)` equals `certifyFloor(M, g, L).required` as the plan specifies it (a solve restricted to
`floor(L)`, `assumeUniqueness: true`, not solved means required).

**Preconditions.**

- **P1, prefix.** In `ladder(all)`, every id of `floor(L)` precedes every id outside it. It holds for every level and
  variant when the S2.1 invariant holds (w(a) < w(b) implies order(a) < order(b)): a floor id has
  `1.25 w < max(i - 1)`, an outside id `1.25 w >= max(i - 1)`, so the floor id is lighter and earlier; equal weights
  fall on the same side of every threshold. At HEAD it fails for one inversion only, which straddles the Hard / Expert
  edge: `jellyfish` (order 160, weight 520, Hard) after `xyWing` (140, 650) and `xyzWing` (150, 750, Expert). The
  other inversions stay inside the Easy tier: `cageCombo` (55, 40) after `boxLine` (50, 50), `ineqChain` (65, 40)
  after `boxLine` and `nakedPair` (60, 120) (`core/js/engine/tech-cage.js:615`, `core/js/engine/tech-ineq.js:476`,
  `core/js/engine/tech-subset.js:220`, weights `generator/js/engine/difficulty.js:71-98`).
- **P2, same solve.** Same model, givens and initial state; both solves use `assumeUniqueness: true` and no technique
  options (`rate()` passes none; the plan's `certifyFloor` passes none, plan:181).
- **P3, deterministic finders.** Each `find` is a function of (model, state, options): no cache keyed by mutable
  object identity, scratch reset per call. A budget check may throw; a finder that swallows the error looks like
  "nothing found", but the solver checks the budget again before returning STUCK
  (`core/js/engine/logical-solver.js:265-268`), so a completed solve never followed a budget-altered path.
- **P4, one rating.** R is the result of one `rate()` call on exactly M and g, not a rating copied from another model
  (changed cages or signs) or rebuilt.

**Greedy-ladder argument.** The solver loop scans its ladder from the first id at every iteration, applies the first
non-null finding, and returns STUCK when every id returns null (`core/js/engine/logical-solver.js:246-269`). Let the
full solve apply t1, t2, ... from s0. Suppose both solves are in state s_k. If t(k+1) is a floor id, every id before
it in `ladder(all)` returned null at s_k; by P1 these are exactly the floor ids before it in `ladder(floor)`, so the
restricted scan sees the same nulls (P2, P3), reaches t(k+1), gets the same finding and moves to the same s(k+1). If
t(k+1) is outside the floor, by P1 every floor id precedes it and returned null at s_k, so the restricted scan finds
nothing: STUCK at s_k, not solved, required. If the full solve ends having applied only floor ids, the restricted
solve ends the same way. Hence the restricted solve is solved exactly when R is solved and every applied id is a floor
id.

**In-band corollary.** A rating in the band of L uses only ids of `allowed(L)`. The peak P is the largest weight used
(`outranks` compares weights first, `generator/js/engine/difficulty.js:214-222`) and the work is at least P, so the
work term `0.25 P log2(1 + work / P)` is at least `0.25 P` and the unrounded score is at least `V + 1.25 w` for every
id used (`generator/js/engine/difficulty.js:233-271`). The band edges are integers and rounding is monotone, so a
score below `max(L)` implies `1.25 w < max(L)`. So for an in-band rating, required means "the rating used a tier id"
(the plan's `tierUsed`, taken from the rating).

**Uniqueness-dependent techniques.** Unique Rectangle (and BUG+1 after S3) are active in both solves (P2) and ordered
by weight like every other id (900 and 920, orders 180 and 182, Master tier; plan:474), so P1 covers them. The
certificate inherits the rating's uniqueness assumption, which every exactness decision already relies on (the same
rating decides the level). A report solved with `assumeUniqueness: false`, such as the guided-dig oracle's
(`generator/js/engine/digger.js:673-678`), must never be used: Unique Rectangle is skipped there and the path can
differ.

**Exceptions: use `certifyFloor`, which stays as the reference implementation.**

- Any rating made before S2.1 lands (P1 fails at the Hard / Expert edge).
- Ratings solved with technique options (`maxChainLength`, `maxNishioDepth`), a restricted `allowedTechniques`, or
  `assumeUniqueness: false`.
- Ratings not produced by one `rate()` call on exactly this model and givens.
- Independent checks in tests, soak and tools (they may compute both and count mismatches).

VeryEasy and levels with an empty tier (Hell 1 and Hell 2 at HEAD; only Hell 2 once `nishioDeep`, weight 2600,
plan:412, gives Hell 1 a tier) are vacuous by definition, not by derivation: the derivation would give false
for an in-band rating with an empty tier. A contradiction gives `R.solved === false` (never exact); a budget error
throws from `rate()` as today; `certifyFloor` propagates budget errors and treats a contradiction as invalid input,
never as required.

**API.** `SG.difficulty.requiredOf(rating, level, model)` returns `{ required, vacuous, floorLevel }` (pure, no solve);
`certifyFloor(model, givens, level, budget)` returns the same plus `unsolvedCount`;
`isExact(rating, level, model) = rating.solved && rating.level === level && requiredOf(...).required`. The certificate
need not be stored in ratings, caches or exports: it is recomputed from `techniqueCounts`.

**Evidence and tests.** SA1: 96 of 96 at HEAD (classic9 Normal to Nightmare, 12 each; Killer, Jigsaw9, Greater-Than
Normal to Expert, 4 each), although P1 fails there at the `jellyfish` edge: no sample reached that case. SA2: 39 of
39 (18 constructed fixtures, 12 old Nightmare, 9 variant samples). The floor task
adds a quick test of equality over the constructed and published fixtures and a few fixed generated puzzles; from the
order task on, it must hold without exception, and the global order-invariant test guards P1 for every variant.

---

## 4. Final position table

| # | Item | SA1 final position | SA2 position as I understand it | Status |
|---|---|---|---|---|
| 1 | SA1-Q-S1 / SA2-Q-S04 chain window | implement the window as a constant; in the chain-id task measure <= 6 and <= 4 on fresh generation (classic9 plus two variants, bounded shards) and keep the window with the higher exact Nightmare rate, the plan's <= 6 on a tie; owner approves this rule | measure candidate cutoffs; do not adopt <= 4 on twelve old traces | for owner (approach agreed; rule to approve) |
| 2 | SA2-Q-S04 `nishioDeep` depth | depth 2 by default, depth 3 only with the explicit option; window enforced in the wrapper | same | agreed; for plan author |
| 3 | SA1-Q-S2 Easy | consequence of the fixed decision; documented in notes | same | agreed (closed; owner informed) |
| 4 | SA1-Q-S3 / SA2-Q-S06 shallow warnings | both warnings, `tune.shallow`, `{level}` passed by `result-view` | same | agreed; owner confirms |
| 5 | SA1-Q-S4 / SA2-Q-S03 target scope | guided dig first; extend to `refineDown` and local search in the same task if Expert's median band position stays above 0.75 | carry one coherent target into refine and local search now | **for owner (disputed)** |
| 6 | SA1-Q-S6 / SA2-Q-S07 history and floor | new history entries store the rating version; entries without it say "made by an earlier version: picking it makes a new puzzle"; the floor is derived, not stored or exported | truthful version/unknown wording; choose the schema scope first | agreed; owner confirms scope |
| 7 | SA1-Q-S5 offered levels | the plan's policy (plan:305-306, 562): qualification decides; notes record the Nightmare / Hell 1 risk with §1.3's data | same | agreed (closed; owner informed) |
| 8 | SA2-Q-S01 VeryEasy | real difference, vacuous at index 0 | same | agreed; for plan author |
| 9 | SA2-Q-S02 floor bound and unknown | moot for generation (derived certificate); `certifyFloor` inherits the caller's budget, errors propagate, contradiction is invalid input | accepts the derivation for canonical ratings after S2.1; keep explicit statuses for the solve-based API | agreed |
| 10 | SA2-Q-S05 expensive-pattern bounds | documented limits chosen from bounded measurements | same | agreed recommendation; for owner or plan author |
| 11 | SA2-Q-S08 baseCosts, ALS group | positive baseCosts increasing with weight (they order `hardestTechnique` and the solver's own score in solver reports, `core/js/engine/logical-solver.js:282-287`, and do not enter the v3 score); group `chain` | same; author contract | agreed; for plan author |
| 12 | SA2-Q-S09 Killer interaction | closed, quick regression added | same | agreed |
| 13 | SA2-Q-S10 reference labels | the plan's rule inside the technique's tier window, else record the reclassification | keep v2 labels as history, v3 expectations, no weight inflation | **for plan author (disputed against plan:507-508)** |
| 14 | SA2-Q-S11 help examples | real examples through the bounded tool with Jigsaw snapshots; the owner decides only if an id has no real example | same | agreed |
| 15 | SA2-Q-S12 shallow-search budget | (c) measured, (a) baseline | (c) | agreed; value for plan author |
| 16 | SA1-Q-S7 derived certificate | adopt (§3) | accepted for complete canonical `rate()` results after S2.1 | agreed; for plan author |
| 17 | `tierUsed` | steering proxy only | same | agreed |
| 18 | Long/deep minimum | enforced in the wrappers | same | agreed |
| 19 | PROC-S1 step order | S2.1 before S1 | same (SA2-R §0: "a useful schedule improvement") | agreed |
| 20 | Tooling task position | before the order change: S2.1 is the first output change and needs the golden-analysis recorder | after the order change, before the first new id | **disputed (minor; plan author)** |
| 21 | Hash updates | in every task that changes a smoke cell; full-table review consolidated (§1.4) | consolidated at the S2.2 checkpoint and the end | **disputed** (SA2's rule for quick-breaking outputs covers it, §1.4) |
| 22 | PROC-S1 qualification timing | after S2.2 and at the end | same (SA2-R §0) | agreed |
| 23 | Chain numbers | 6/12 floor-stuck, 2/12 exact under <= 4; 0/12 under <= 6 | same | agreed |
| 24 | `tech-subset` counter | reset per call in the first output-changing task, with a determinism test | pre-existing issue, localise | agreed |
| 25 | Effort | agent hours per task and long runs listed separately; not averaged with engineering hours | same | agreed |
| 26 | Qualification record | the plan's `docs/difficulty-rating/qualification.md` (plan:305; `qualify.js --markdown` writes its body, `generator/tests/qualify.js:71`), with the v3 evidence notes under `docs/difficulty-v3/` | a new `docs/difficulty-v3/qualification.md` (SA2-R §5.3) | **disputed (minor; plan author)** |

---

## 5. Merged task breakdown I would sign

SA2's MS numbering is adopted; the only change is the position of MS04 (tooling) before MS03 (orders). One developer
holds the repository; every task ends with both quick sets green (`cd generator && node tests/node-runner.js`;
`cd player && node tests/node-runner.js`) and one commit, updates the living documents its change touches (both
guide languages), and keeps tool-written files in their `.gitattributes` line endings (CRLF, except
`player/tests/fixtures/exports/*.txt` and `.github/scripts/*.sh`). The integration bundle is SA2's list (SA2-R §5.2).
Gate names: GG hash update (and `--check-hashes` at checkpoints), GR replay wire, golden analyses and step goldens
(`generator/tests/suites/steps.test.js`, for example 879-889), GH help examples,
GD manual `difficulty` suite (and `killer`, `greater-than` when their pins change), GS soak, GQ qualification
(`node tests/qualify.js` in `--variant` / `--level` shards; its table goes into
`docs/difficulty-rating/qualification.md` and a level that fails leaves the variant's `difficultySupport` list,
plan:303-307), GP performance gate.

| ID | Title and scope | Depends on | Files owned (exclusive while active) | Gates | Size |
|---|---|---|---|---|---|
| MS01 | Tier sets, `requiredOf`, `certifyFloor`, VeryEasy rule, equivalence test (S0.1) | SA2-Q-S01 | `generator/js/engine/difficulty.js`, `generator/tests/suites/difficulty-floor.test.js` (new), `generator/tests.html`, `generator/design.md` §6.7, §13.7, `DEVELOPERGUIDE.md`, `DEVELOPERGUIDE.vn.md` | - | M |
| MS02 | Soak columns and v2 baseline (S0.2): peaks, band-position deciles, chain length and Nishio depth, in-band shallow share | MS01 | `generator/tests/soak.js`, `docs/difficulty-v3/baseline.md` (new) | GS (before), bounded shards | M |
| MS04 | Tooling: recorder/checker for the golden analyses that `generator/tests/suites/replay.test.js` pins by hand (611-635) for the 14 requests of `generator/tests/fixtures/replay-goldens.js`; help-example tool with project-relative stage file, line-ending-correct output, bounded id/source selection, Jigsaw region snapshots and `modelOf` Jigsaw branch | MS02 | `generator/tests/replay-fixtures.js` or a new recorder under `generator/tests/`, `player/tests/tools/make-technique-examples.js`, `player/js/ui/help.js` (Jigsaw branch), helper tests | both tools in check mode with no diff at HEAD | M-L |
| MS03 | Orders monotone in the weights (S2.1); fixture ladder split; `tech-subset` counter reset with determinism test | MS04 | `core/js/engine/tech-cage.js`, `core/js/engine/tech-ineq.js`, `core/js/engine/tech-fish.js` (orders), `core/js/engine/tech-subset.js` (counter), pinned core and manual order tests, integration bundle | GG, GR, GH, GD | M |
| MS05 | Exactness means required (S1.1): `isExact` from `requiredOf`, certified keeper distance, local search with `spec.level` and the SA2-Q-S12 measurement, refine, early stops, `pipeline.run` returns `exact`, soak and qualify consumers, `tune.shallow`, `difficulty.shallow` with arguments | MS03; SA2-Q-S06, SA2-Q-S12 | `generator/js/engine/digger.js`, `generator/js/variants/killer.js` (`closer` call only), `generator/js/engine/pipeline.js`, `generator/js/engine/events.js`, `generator/js/ui/result-view.js`, `generator/js/ui/app.js`, generator locales, `generator/tests/soak.js`, `generator/tests/qualify.js` (exactness read), digger, events, result-view and steps tests | GG, GR | L |
| MS06 | Band target (S1.2): one draw per sample, discriminated objective, comparator seam, fixed stop rule, proposal digs excluded, refine/local per SA2-Q-S03 | MS05; SA2-Q-S03 | `generator/js/engine/digger.js`, generator locales, `generator/js/ui/help.js`, `generator/design.md` §6.8, guides, digger tests | GG, GR; bounded soak shard for band positions | L |
| MS07 | Chain ids (S2.2) with enforced windows, technique id parameter, internal general seam; window measurement per §4 item 1 | MS06; SA2-Q-S04 | `core/js/engine/tech-chain.js`, `core/tests/suites/tech-chain.test.js`, integration bundle; at the checkpoint `docs/difficulty-rating/qualification.md`, the variants' `difficultySupport` lists and the offered table of `generator/tests/manual/difficulty.test.js` | GG, GR, GH; first checkpoint: GG `--check-hashes` full table, GQ shards, GD | L |
| MS08 | Skyscraper, two-string kite, empty rectangle (S3 group 1) | MS07 | `core/js/engine/tech-fish.js`, `core/tests/suites/tech-fish.test.js`, integration bundle | GR, GH (GG if a smoke cell changes) | L (split the empty rectangle off if over 1,600 lines) |
| MS09 | Finned X-Wing and Swordfish with sashimi (S3 group 2) | MS08 | same as MS08 | GR, GH | L |
| MS10 | Remote pairs, WXYZ-Wing (S3 group 3a) | MS09; SA2-Q-S05 | `core/js/engine/tech-wing.js`, `core/tests/suites/tech-wing.test.js`, integration bundle | GR, GH | L |
| MS11 | UR type 3, 4, hidden; guarded BUG+1 (S3 group 3b) | MS10 | same as MS10, `core/tests/suites/techniques.test.js` (uniqueness list) | GR, GH | L |
| MS12 | XY-chain (S3 group 4a) | MS11 | `core/js/engine/tech-chain.js`, chain tests, integration bundle | GR, GH | M-L |
| MS13 | Grouped nodes, proof representation and formatting (S3 group 4b) | MS12; SA2-Q-S05 | `core/js/engine/tech-chain.js`, chain proof checker, `generator/js/ui/i18n.js`, `player/js/ui/i18n.js`, `player/js/ui/play.js`, integration bundle | GR, GH; GP shard | L (split graph and formatting if needed) |
| MS14 | Law of leftovers (`jigsaw9`), Killer interaction quick regression (S3 group 5) | MS13; SA2-Q-S05 | `core/js/engine/tech-subset.js`, its tests, a focused cage test, integration bundle | GG (Jigsaw Normal), GR, GH, GD (`killer`) | L |
| MS15 | ALS enumerator and ALS-XZ (S3 group 6a) | MS14; SA2-Q-S05, SA2-Q-S08 | `core/js/engine/tech-als.js` (new), `core/tests/suites/tech-als.test.js` (new), the eight source lists, both `CORE_SUITE_FILES`, integration bundle | GR, GH; GP shard | L |
| MS16 | Sue de Coq; `forcingChainLong` order 198 (S3 group 6b) | MS15 | `core/js/engine/tech-als.js`, ALS tests, `core/js/engine/tech-chain.js` (order), integration bundle | GR, GH | L |
| MS17 | Version 3 (S2.3): `RATING_VERSION` 3, cache schema 3 and regeneration equality, history version per SA2-Q-S07, pinned version tests, notes, docs index, "Known limitations and ideas" section | MS16; SA2-Q-S07, SA2-Q-S10 | `generator/js/engine/difficulty.js` (version), `generator/js/ui/cache.js`, `generator/js/ui/history.js`, `generator/js/ui/export.js` (only if needed), generator locales, `generator/tests/manual/difficulty.test.js` (version pins), `docs/difficulty-v3/notes.md` (new), `docs/README.md`, design docs, guides | GG, GR, GH, GD | M |
| MS18 | Final evidence: soak after, qualification of every offered pair, performance gate, support lists per the plan | MS17 | `docs/difficulty-rating/qualification.md` (plan:305), the variants' `difficultySupport` lists, the offered table of `generator/tests/manual/difficulty.test.js`, the evidence record under `docs/difficulty-v3/`, living links | GS (after), GQ (final), GP, GD, GG `--check-hashes` | M plus long runs |

```
MS01 -> MS02 -> MS04 -> MS03 -> MS05 -> MS06 -> MS07 -> MS08 -> ... -> MS16 -> MS17 -> MS18
```

Parallelism: none inside the repository (shared bundle, hashes, goldens, help examples). The chain runs in parallel
with the Pentomino chain; timing-sensitive runs (GP, GQ) of the two repositories are not run at the same time.

---

## 6. Errata added in this phase (beyond SA1's cross-review)

| Id | SA1 text | Correction |
|---|---|---|
| E10 | First report Q-S1 (b) "6 of 12 sampled Nightmare puzzles ... qualify" | 6 of 12 have a stuck Master floor; 2 of 12 are exact Nightmare after re-scoring (§1.3) |
| E11 | First report §4 S2.2 "no minimum is needed" for the long id | the wrapper enforces the window; the id can run alone |
| E12 | First report §4 S1.1 steering: "`tier` from the oracle ("a tier technique was used") equals "required" only when ladder orders are monotone in the weights" | only the rating's own technique counts do (§3); the dig oracle runs with `assumeUniqueness: false`, so its `tier` stays a proxy after S2.1 |
| E13 | First report §0 #8: the tool "handles classic9, diagonalX, hyper, killer and greaterThan only (no jigsaw for `lawOfLeftovers`)" | `jigsaw9` is in the tool's plan; the region snapshot and the help model are missing (§1.1 point 6) |
| E14 | First report R4 `SHALLOW_SEARCH_RATINGS = 128` | a measured value, SA2-Q-S12 (§2) |
| E15 | First report Q-S2 and Q-S5 as owner questions | consequences of a fixed decision and of the plan's qualification policy; documented, not asked |
| E16 | First report §4 S1.2 "counts one oracle call in `stats.oracleCalls`" | only the bounded objective counts; count the initial evaluation explicitly |
| E17 | First report §4 S0.1 test (4) "a constructed Normal puzzle certified for `hard`" | a helper negative only; acceptance uses an in-band shallow sample or a scripted rating |
| E18 | Cross-review §1.3 "Generation itself uses no node budget" | the guided-dig objective's `OBJECTIVE_STEPS` guard counts checks (`generator/js/engine/digger.js:641, 679-697`); `tech-subset.js`'s counter matters today (§1.5) |

The cross-review's E3 (hash updates in the task that changes a smoke cell, not only at the checkpoints) stands; §1.4
gives its evidence.
