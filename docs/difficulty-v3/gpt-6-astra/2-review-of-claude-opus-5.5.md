# Cross-review of SA1's independent Sudoku report

SA2, gpt-6-astra; 2026-11-12. Reviewed
`docs/difficulty-v3/claude-opus-5.5/1-report.md` against unchanged HEAD `6abcb9f`.
This is the cross-review, not the joint report. Neither first report, the plan, nor the clarification file
was changed. Question IDs use the orchestrator's `SA1-` / `SA2-` prefixes.

No test suite or approved heavy gate was run in this phase. New checks were bounded source-level,
in-memory probes. Full S0-S3 scope and developer gate pre-approval remain fixed; new behavioural choices
below still require an answer.

## 0. Summary

I agree with most of SA1's integration corrections, its observations about shallow levels outside classic9
Hard/Expert, its separate historical/current fixture ladders, and the need for real help examples and
golden-analysis regeneration. Moving S2.1 before acceptance integration is a useful schedule improvement.

The most important disagreements or qualifications are:

1. **The VeryEasy tier contradiction is still present in SA1's proposed correction.** Empty floor,
   empty tier and `floor union tier = allowed` cannot all hold when three singles are allowed.
2. **The shorter chain split is not yet a demonstrated qualification fix.** I reproduce all twelve
   old Nightmare chain traces. Simulating the <=4 / 5-12 split makes six lower floors stuck, but only
   **two** remain in the Nightmare score band; four move into Hell 1 without needing its new tier.
3. **A maximum alone does not enforce the long/deep IDs' minimum.** The full ladder often calls the
   short ID first, but the public `allowedTechniques` API can call the long/deep ID alone.
4. **Monotone weights do not make `tierUsed` identical to certified requiredness when uniqueness
   options differ.** The oracle excludes UR/BUG; the certificate includes them after uniqueness proof.
   Keep tier use a steering proxy.
5. **Easy's changed meaning is a fixed-decision consequence, not an owner question to reopen.**
   Likewise accepting final qualification outcomes is already the plan's policy, not permission to
   quietly recalibrate existing weights.
6. **Jigsaw is already in the help example generator's input plan.** The missing parts are snapshot
   region data and help-model reconstruction, not absence from the input variant list.
7. **The keeper's cheap pretest can remain valid** if it is explicitly an optimistic lower bound and
   the stored distance is certified. My first report overstated the need to change that function itself.
8. **128 shallow-search ratings is a new policy knob**, not an implementer-only bug fix. It needs a
   measured cap/acceptance decision.

### New evidence and omissions adopted from SA1

- Broader shallow-floor impact: Master, all sampled old Nightmare puzzles, Killer Hard/Expert and
  some Jigsaw/Greater-Than results.
- `generator/tests/suites/steps.test.js:879-889` pins an additional replay score transition; my first
  report did not name that exact obligation.
- Jigsaw help snapshots cannot currently be reconstructed despite Jigsaw generation already existing.
- `tune.miss` can say “wanted Hard, got Hard”; a `tune.shallow` event is a worthwhile explicit option.
- Qualify once after a coherent chain-window integration, and finally after all S3, instead of treating
  every intermediate development state as a final availability decision.

### What my first report adds to SA1's

- VeryEasy algebra, `label` rather than `level`, and explicit unknown/contradiction certificate states.
- Pipeline results omit `exact`; soak reconstructs it incorrectly from score alone on variant paths.
- History stores neither ratingVersion nor the old puzzle, so a v2 marker is not a two-string UI patch.
- Grouped graph nodes require proof serialization, buffer and both-app formatting changes.
- Detailed soundness contracts for finned fish, WXYZ, BUG, rectangles, leftovers and ALS/Sue de Coq.
- New deterministic caps interact with `tech-subset`'s process-persistent check-spacing counter.
- The current example generator's `--puzzles` flag does not bound stage-1 generation; qualification
  and p95 measurements must use complete, documented bounded shards.

## 1. Rechecks in this phase

### 1.1 Nightmare trace and window simulation

Using the plan's engine load order, regenerated classic9 Nightmare seeds 1..12 and collected solve steps.
Every logical solve/generation call had an explicit 15-second budget. Maximum forcing-chain lengths:

```text
seed:     1  2  3  4  5  6  7  8  9 10 11 12
maxLinks: 5  5  5  4  3  6  4  4  4  5  3  5
```

All peak at `forcingChain`, confirming SA1. Then changed registrations **only in memory**:

- short chain maximum 6 or 4;
- long chain maximum 12 with the matching inclusive minimum and weight 1400;
- Nishio depth 1 / deep depth 2 with weight 2600;
- all other implementations/weights held at HEAD.

This is a fixed-puzzle comparison, not v3 generation qualification or a test of the future S3 catalogue.

| Short-chain maximum | Old Nightmare puzzles whose Master floor gets stuck | Still in Nightmare band and required | New score outcomes |
|---|---:|---:|---|
| 6 | 0/12 | 0/12 | Existing scores unchanged |
| 4 | 6/12 | **2/12** | Seed 1: 2253; 12: 2172 remain Nightmare. Seeds 2/3/6/10: 2420/2850/2940/2721 become Hell 1. Others remain shallow Nightmare. |

Those four new Hell 1 labels are still solved by Nightmare's allowed set in this simulation, so they do
not become certified Hell 1 results. The window change can help generation find different candidates,
but “six now qualify as Nightmare” is true only of the **floor predicate**, not exact acceptance.
The relevant code is `core/js/engine/tech-chain.js:389-426`,
`generator/js/engine/difficulty.js:233-271, 344-348`, and the plan's new 1400/2600 weights.

A direct additional probe on seed 5's pre-chain stuck state found a three-link proof when asked for the
existing chain finder with only maximum 12. Renaming that result to `forcingChainLong` without checking
the minimum would classify a short proof as long. `allowedTechniques` can omit the short ID
(`core/js/engine/logical-solver.js:100-114`), so preceding-ladder behaviour is not a sufficient API guard.

### 1.2 Additional shallow samples

Rechecked one seed from each of SA1's added categories; each call had a 20-second budget.

| Variant / request / seed | Score / peak | Lower-tier outcome | Wall time |
|---|---|---|---:|
| classic9 / master / 1 | 1096 / xyWing | Solved | 0.211 s |
| killer / hard / 1 | 570 / ruleOf45 | Solved | 0.973 s |
| killer / expert / 1 | 798 / simpleColouring | Solved | 12.129 s |
| jigsaw9 / expert / 1 | 716 / simpleColouring | Solved | 0.051 s |
| greaterThan / hard / 1 | 486 / nakedQuad | Solved | 2.312 s |

This independently supports the direction of SA1's broader finding without claiming to reproduce every
six/twelve-seed percentage. The slow Killer Expert sample is another reason not to infer performance
from classic9 alone.

### 1.3 VeryEasy and Jigsaw help

`spec('veryEasy', model9).allowedTechniques` is exactly:

```text
['nakedSingle', 'hiddenSingleBox', 'hiddenSingleLine']
```

Subtracting an empty floor yields those three, not an empty tier. The actual filter is
`generator/js/engine/difficulty.js:334-370`.

The help generator already includes `['jigsaw9', ['hard','expert','master'], 40]`
at `player/tests/tools/make-technique-examples.js:33`. Its snapshot omits region layout
(`:134-147`), and `player/js/ui/help.js:70-79` has no Jigsaw branch.
An in-memory Jigsaw example passed to `SG.help.buildExample` returned null.

The reusable builder already exists: `SG.textBoards.jigsawSpec(cellRegion)` at
`player/js/engine/text-boards.js:141-160`. Rebuilding with that function produced a `jigsaw9` model.
Add `cellRegion` to snapshots and call that builder in help; no new Jigsaw engine is required.

### 1.4 Keeper precheck

For the plan's distance function, an uncertified solved in-band rating has optimistic distance 0;
its eventual certified distance is 0 for required or 0.5 for shallow. Therefore:

- if the keeper has shallow distance 0.5, the uncaptured candidate passes `0 < 0.5`;
- if the keeper has required distance 0, no in-band candidate can strictly improve it;
- after certification, recompute distance and reject a non-improving offer.

So `keeper.closer` can remain a cheap strict precheck under this exact ordering. The actual bug is saving
the **pre-certification** distance, not inherently the existence of a precheck
(`generator/js/engine/digger.js:1047-1070`). A new unknown-status penalty or target tie-break must
preserve the lower-bound property or revise the precheck accordingly.

## 2. Claim-by-claim review

### 2.1 Top findings

| SA1 claim | Position | Evidence / qualification |
|---|---|---|
| 1. Requiredness bites Normal/Master/Nightmare and variants more than classic9 Hard/Expert | Agree | Both reports' main samples agree; the additional probes above corroborate the new categories. |
| 2. <=6 chain window leaves all sampled Nightmare puzzles shallow | Agree | All twelve traces reproduced. “May become unreachable” is a risk, not proof about fresh v3 generation or future S3. |
| 2. <=4 / 5-12 makes six qualify | Partly | Six have a stuck Master floor, but only two remain in the Nightmare band. Reclassification and new generation need measurement before choosing a cutoff. |
| 3. Easy must need locked/pair work | Agree as a consequence; disagree with reopening it | Fixed decision applies to every non-vacuous level. Singles-only score-46 Easy fixtures are shallow; the owner already selected that rule. |
| 4. Five of twelve old family-certified fixtures fail the proposed floor assertion | Agree | Normal-1/3 and Nightmare-1/2/3; our independent floor probes match. Add that the fixture field is `label`, not `level`. |
| 5. Keeper distance needs recomputation; local search can burn caps | Agree | `generator/js/engine/digger.js:1051-1070, 1392-1499`. New 128 cap is a policy choice, not a bug fix. Cheap optimistic pretest can remain. |
| 6. Tier-losing stop and proposal-target defects | Agree | `generator/js/engine/digger.js:654-702, 719-794`; proposal priority is not a score. |
| 7. S2.1 breaks frozen classic ladder equality | Agree | `core/tests/suites/techniques.test.js:41-43`; `core/tests/fixtures/techniques.js:33-45`. Keep old fixture preprocessing separate from current registry expectations. |
| 8. Every new unscoped ID needs fixture positions; every ID needs help example; BUG changes uniqueness list | Agree | `core/tests/suites/techniques.test.js:64-87`; `player/tests/suites/help.test.js:126-146`. Scoped `lawOfLeftovers` needs explicit scoped positives rather than being silently counted in the classic fixture list. |
| 8. Help tool has no Jigsaw support | Partly / narrower correction | Jigsaw is already generated at `player/tests/tools/make-technique-examples.js:33`. Snapshot/reconstruction support is missing; the new builder can reuse `player/js/engine/text-boards.js:141`. |
| 9. Quick replay goldens and step assertions move | Agree on obligation, not “every task necessarily breaks every golden” | `generator/tests/suites/replay.test.js:611-635`; `generator/tests/suites/steps.test.js:879-889`. Inspect actual diffs and refresh only justified output changes. |
| 10. cageLocked unnecessary, manual suite paths, UR floor comment | Agree | Existing cageCombo proves ordinary cage/unit and two-cell killer-pair deductions (`core/js/engine/tech-cage.js:118-191`; manual Killer test `559-574`). UR belongs to Nightmare's floor, not Master's. |

### 2.2 Step-by-step review

| Step / SA1 position | Verdict and merged correction |
|---|---|
| S0.1 “correct”, VeryEasy empty and vacuous, union invariant everywhere | Disagree with this combination. The base case needs an explicit exception or actual singles tier. Recommend actual difference plus vacuous certification for index 0, as SA2-Q-S01. |
| S0.1 `assumeUniqueness:true` at planned acceptance call sites | Agree when the stated proof ordering is retained. The API itself must document/require the precondition; contradiction and a missing certificate are not “required”. Standalone arbitrary inputs are not automatically unique. |
| S0.1 tests should skip unsupported levels | Partly. Calling `spec` for the requested unsupported level is invalid. However floor derivation must use the previous global level even when that predecessor is not offered; do not skip its techniques or call unsupported `spec(previous)`. |
| S0.1 corrected Normal certified as Hard test | Useful as a helper negative, but not an acceptance regression: that fixture's rating is Normal, so it is not an in-band shallow Hard sample. Use a true shallow Normal sample or a bounded scripted in-band rating to test `keptPuzzle`/selection. |
| S0.2 chain-length histogram | Agree; add depth histogram and count denominators. Measure old baseline before order/output changes. In-band shallow denominator must not become “exact only”, which would become zero by definition after S1. |
| S0.2 `--quick --no-gate` full baseline | Pre-approved in intent, but split by explicit variant/level/count to obey bounded-run constraints. Keep raw exits/violations separate; `--no-gate` cannot be used to call an invariant failure success. |
| S1.1 keeper after-count recomputation, cheap `closer` stays | Agree; this corrects my overbroad first wording. Test optimistic<=actual and certified stored distance; do not use missing certification as exactness. |
| S1.1 use `spec.level` in local search | Agree. The literal plan replacement otherwise references an undefined `level` local (`generator/js/engine/digger.js:1320-1328`). |
| S1.1 fixed 128 shallow-search ratings | Not adopted. Measure and submit as SA2-Q-S12; existing caps already guarantee termination, but a new smaller cap changes hit rates and fallback selection. |
| S1.1 `tune.shallow` | Agree as a good owner-visible choice. Add vocabulary/locales and a targeted event test; update `wanted X, got X` text. Both warning keys preserve qualification/retry behaviour. |
| S1.1 `tierUsed` equals required after S2.1 | Disagree in general. Weight monotonicity makes a prefix only for identical solver options. The oracle excludes uniqueness techniques, whereas floor certification includes them (`core/js/engine/logical-solver.js:109-112`; `generator/js/engine/digger.js:674-678`). |
| S1.2 termination and corrected stop | Agree on termination, with a tighter statement: successful removals are bounded by clues; failed pools can also iterate but permanently reject finite groups. Use one consistent lexicographic comparator/strict-improvement rule and a stable tie policy. |
| S1.2 target null for proposals | Agree. Do not compare `STUCK_SCORE+unsolved` to a score target. Preserve proposal's own priority ordering. |
| S1.2 initial objective with empty group | Safe in the known-unique handover context because the uniqueness loop over an empty group does no work. But proposal mode does not increment `stats.oracleCalls` there today, contrary to SA1's blanket wording; count the intended work explicitly. |
| S1.2 six Hard seeds not all top quarter | It is deterministic but **not a regression test for new behaviour**: it already passes at HEAD. Add scripted target/comparator cases plus real exactness/seed integration. |
| S2.1 orders 44/46/137 and split fixture ladder | Agree. Preserve equal-weight tie outcomes. Adjacent sorted-weight assertion handles order ties more completely than only strict-order pair implication. |
| S2.2 no minimum needed for long ID | Disagree at the API boundary. Restricted solvers/direct finders can run long alone; the maximum-only probe returns length 3. Enforce the inclusive window inside the wrapper. |
| S2.2 deep Nishio starts at depth 2 | Partly. It must not relabel a depth-1 proof when used alone. Exclude shallower proofs for the same registered search contract, and define default maximum 2 versus 3 explicitly. |
| S2.2 per-state 12-link cache | Optional and delicate: mutable state-object identity is not a valid cache key. Cache only exact candidate-state/version results or per-call data; no semantic change from stale proof reuse. |
| S2.2 “`.step` keys” | Incomplete for chain IDs: existing findings use `.step.endpoints`, `.step.contradiction`, `.step.forced` (`core/js/engine/tech-chain.js:382-385`). Include descriptions and both apps' chain-formatters. |
| S2.3 history marker as two strings | Disagree with feasibility claim. `generator/js/ui/history.js:21-22, 60-80` has no ratingVersion, no stored full puzzle, and regenerates entries. A truthful marker needs summary schema/legacy wording or result-only scope. |
| S3 order/weight assignments | Agree with final long-chain order 198. All target tiers mathematically match the table; WXYZ at exactly 1000 is Master, not Expert. |
| S3 group 1 | Agree at inventory level. Empty rectangle needs a precise grouped implication and all-member visibility, not only a box-kind guard. Use my first report's bounded direct proof. |
| S3 group 2 | Agree, including sashimi. Require disjoint complete bases, fins in one box, and targets seeing every fin; a fin mask alone is not a soundness specification. |
| S3 group 3 | Agree on IDs/subtypes and BUG registry test. Add global BUG occurrence invariant and geometry/constraint guards; retain all-solution soundness testing where uniqueness is not assumed. |
| S3 group 4 | Agree “cell strong links only” means bivalue-cell strong edges with peer same-digit weak links. Grouped AIC also needs explicit group node representation, scratch bounds and both-app proof formatting, not only search edges. |
| S3 group 5 | Agree no duplicate ordinary cageLocked. Add Jigsaw `cellRegion` snapshot/rebuild support, not another variant generator. Leftovers must compare multisets including fixed values and bounded unit unions. |
| S3 group 6 | Agree ALS can use group `chain`; choose baseCosts and bounded enumerator contracts explicitly. No silent unbounded ALS-pair scan on large boards. |
| S3 keep all 18 constructed labels by adjusting new weights | Unresolved conflict in the plan: cheaper named techniques intentionally lower some old scores. Preserve v2 labels/certificates as historical; obtain owner guidance for v3 expectations rather than inflate new weights merely to keep old names. |

## 3. Important distinctions for the joint report

### 3.1 Evidence of scarcity is not proof of unreachability

The new floor check invalidates the sampled old Nightmare results under the six-link split. That is
strong motivation to measure the new generator, not evidence that no fresh puzzle can need a seven-link
chain, Nishio, ALS-XZ or Sue de Coq. S3 adds Nightmare techniques and changes lower solve paths.

Likewise shortening the window changes both classification and generation oracle behaviour. The in-memory
comparison shows four newly required cases overshoot Nightmare. The joint report should distinguish:

1. old fixed-puzzle floor outcomes;
2. old fixed-puzzle v3 scores;
3. new-generation exact hit rates;
4. full final-catalogue qualification.

My position on SA1-Q-S1 is “measure candidate cutoffs, do not adopt <=4 on these twelve traces alone”.
If the owner selects <=4 now, implement it consistently and record the above trade-off rather than
promising six exact Nightmare hits.

### 3.2 Requiredness is operational and option-dependent

The certificate says the specific deterministic floor solver gets stuck. It is not a proof that every
possible lower-technique sequence fails. Weight monotonicity helps align the full solver with the floor,
but only if both calls share candidate initialisation, uniqueness permissions, limits and finder semantics.

The generator's oracle intentionally uses `assumeUniqueness:false` to prove uniqueness through sound
deduction; the floor can use uniqueness-dependent rules after the separate proof. Therefore:

- `tierUsed` is a useful heuristic, never the final certificate.
- A new long/deep ID must enforce its own window, independent of which cheaper IDs were allowed.
- A floor budget exception/contradiction must not be collapsed into `required:true`.
- Unknown/uncertified cannot satisfy exactness.

### 3.3 Calibration and generated examples need bounded tooling

SA1 correctly makes golden/example repair part of the task that changes output. That does not authorise
blindly replacing expected outputs. Regenerate through a bounded recorder, independently verify logical
soundness/shape invariants, then review the intentional score/technique changes.

The existing example tool's Jigsaw input is present but its snapshot does not retain regions. Also
`--puzzles=N` only slices the second stage after the first generated its entire plan
(`player/tests/tools/make-technique-examples.js:252-259`). Add explicit bounded source/ID selection and
deterministic fixture output before treating it as a routine per-technique gate.

Changing gate timing does not waive final qualification, p95 measurements, manual difficulty checks,
or the required quick sets. A long bounded command should remain attached/monitored. “It is a tool”
does not justify an unbounded analysis probe or bypass a stated execution limit.

## 4. Question reconciliation

### 4.1 Position on every SA1 question

| SA1 ID | Maps to | Current position |
|---|---|---|
| SA1-Q-S1, <=6 versus <=4 chain split | Expand SA2-Q-S04 | Keep owner decision; recommend option c, measure both on fixed and fresh puzzles with the intended final catalogue. Current probe gives 0/12 versus 2/12 exact old Nightmare, not six. |
| SA1-Q-S2, confirm Easy needs its tier | No new owner question | Close as a fixed-decision consequence. Document singles-only Easy as shallow; do not reopen “Easy vacuous” without an explicit change to the owner's rule. |
| SA1-Q-S3, shallow warnings/event | SA2-Q-S06 | Agree: keep `difficulty.approximate`, add `difficulty.shallow`, and prefer an explicit `tune.shallow` event or equally clear status-specific rendering. |
| SA1-Q-S4, optional target refinement | SA2-Q-S03 | My first recommendation is stronger: carry a coherent target into refinement/local search where feasible. Treat this as a real owner choice; proposal generation itself stays max-stuck, then refines a real rating. |
| SA1-Q-S5, levels lost or recalibrate existing weights | SA2-Q-S10 plus fixed qualification policy | Accept the final qualification outcome as the plan already directs. Do not change existing weights in this release without the separately required decision. Intermediate failures are evidence, not final support-list removals. |
| SA1-Q-S6, history v2 marker | SA2-Q-S07 | Support truthful version/unknown wording, but not a marker reading a nonexistent history ratingVersion. Choose persistence/schema scope first; regenerated current results are not old v2 results. |

### 4.2 My first questions after cross-review

| SA2 ID | Disposition |
|---|---|
| SA2-Q-S01, VeryEasy algebra | Retain. SA1's proposed empty-tier correction still conflicts with its union test. Prefer actual singles difference plus explicit vacuous certificate for index 0. |
| SA2-Q-S02, floor-work bound/unknown | Retain. Separate inherited cancellation from deterministic certificate caps; never certify an incomplete solve. |
| SA2-Q-S03, target/refine/local policy | Merge SA1-Q-S4. A single target objective is my recommendation; preserve required status and distinguish proposal priority. |
| SA2-Q-S04, chain/depth defaults/windows | Merge SA1-Q-S1; add <=4 as a measured alternative, and require minimum enforcement regardless of ladder context. Deep default 2 versus 3 remains unresolved. |
| SA2-Q-S05, expensive-pattern bounds | Retain. Full named-technique scope does not imply exhaustive unbounded enumeration; owner/author must sign the documented catalogue limits. |
| SA2-Q-S06, warnings | Merge SA1-Q-S3; keep both warning keys and explicit shallow event/status text. |
| SA2-Q-S07, floor/history persistence | Merge SA1-Q-S6; truthful unknown-version metadata, no assumption all legacy summaries are v2. |
| SA2-Q-S08, baseCosts/ALS group | Treat as author/implementer contract unless a visible new group is proposed. Recommend existing `chain` group and a recorded consistent positive cost convention; no reason for a product decision about arbitrary raw-cost bookkeeping if all consumers remain stable. |
| SA2-Q-S09, Killer pattern scope | Close for the ordinary examples already implemented. Reopen only if owner requests stronger assignment-derived interaction beyond the plan's demonstrated examples. |
| SA2-Q-S10, historical labels versus reclassification | Retain; related to but distinct from SA1-Q-S5. Preserve old records and define v3 expectations without silently changing existing weights/bands. |
| SA2-Q-S11, help example acquisition/format | Retain only the externally visible fixture-format decision. Bounded recorder engineering and adding missing Jigsaw region snapshots are implementation obligations. |

### 4.3 Missing question

- **SA2-Q-S12 — Additional shallow-search budget?**
  Options: (a) existing 1,024-rating / 32,768-proposal attempt caps; (b) an additional 128 full ratings
  after first in-band shallow state; (c) measured level/variant-independent cap chosen from hit-rate
  versus cost data. I recommend (c), with (a) as the non-new-policy baseline until selected.
  SA1's R4 currently treats 128 as adopted without the owner answer required for new behaviour.

**Merged active list:** SA2-Q-S01, S02, S03, S04, S05, S06, S07, S10, S11, S12.
SA2-Q-S08 is an author contract; S09 ordinary behaviour, SA1-Q-S2 Easy semantics and SA1-Q-S5 final
qualification policy are already determined rather than new owner choices.
No clarification file was edited.

## 5. Merged task breakdown I would sign

### 5.1 Comparison of ST1-ST13 with SV3-01-SV3-18

Adopt SA1's ordering of **baseline -> monotone orders -> acceptance integration**. It reduces solver-order
confounding and makes the steering proxy closer to the eventual certificate, without claiming equality
under different uniqueness options.

Keep my smaller boundaries for grouped chains, UR/BUG, ALS/Sue de Coq and the helper/format work.
SA1's single ST9 and ST10 each combine enough algorithm/proof/UI-fixture work to exceed a reliable
Large task. Keep task-scoped exact file ownership for weights/locales/fixtures: the S3 groups are not
parallel merely because their main engine files differ.

Consolidate heavy **qualification and hash recording** after the coherent S1/S2.2 checkpoint and again at
final v3, as SA1 proposes. Keep quick-breaking replay goldens and help examples in the task that changes
them. If a deliberately intermediate commit leaves the heavy regression hashes stale, mark that explicitly;
do not call it a fully validated release. All deployed behaviour ships atomically with v3 cache invalidation.

### 5.2 Ownership

One developer holds the repository write/validation lease. Every task updates its directly affected
living docs and both guide languages. The recurring technique integration bundle is:

```text
generator/js/engine/difficulty.js
core/tests/fixtures/techniques.js
core/tests/suites/techniques.test.js
generator/tests/suites/technique-weights.test.js
generator/tests/fixtures/rated.js             // historical/v3 expectations explicitly separated
generator/js/ui/locale.en.js
generator/js/ui/locale.vi.js
player/js/ui/locale.en.js
player/js/ui/locale.vi.js
generator/js/ui/help.js
player/js/ui/help.js
generator/tests/suites/help.test.js
player/tests/suites/help.test.js
player/js/ui/help-examples.js
generator/tests/fixtures/replay-goldens.js
generator/tests/fixtures/replay-wire.js
generator/tests/suites/steps.test.js           // only justified changed golden expectations
```

The task owning a new technique owns the necessary bundle changes, generated evidence and test checks;
no separate concurrent “locale” or “fixture” agent edits those same files.

| ID | Scope / mappings | Prerequisite | Main exclusive files in addition to the bundle where relevant | Size / developer gates |
|---|---|---|---|---|
| MS01 | Tier algebra and proof-aware floor API; ST1 / SV3-01 | S01/S02 answers | `generator/js/engine/difficulty.js`, new floor suite, `generator/tests.html` | M-L; Generator quick |
| MS02 | Soak technique/position/floor/chain-depth columns and v2 baseline; ST2 / SV3-02 | MS01 | `generator/tests/soak.js`, new baseline evidence | M; bounded approved baseline soak before any output change |
| MS03 | Weight-monotone orders and frozen/current fixture-ladder split; ST3 / SV3-05 | MS02 | `core/js/engine/tech-cage.js`, `core/js/engine/tech-ineq.js`, `core/js/engine/tech-fish.js`, pinned core/manual order tests | M; both quick, affected help/replay gates |
| MS04 | Bounded golden/example tooling, including Jigsaw snapshot reconstruction | MS03; before first new ID | `generator/tests/replay-fixtures.js` or new analysis recorder, `player/tests/tools/make-technique-examples.js`, `player/js/ui/help.js`, helper tests | M-L; golden/example regeneration and checks, both quick |
| MS05 | Strict exactness, certified keeper distance, local/spec fix and consumer/event/warning integration; ST4 / SV3-03 | MS03, MS04, S06/S12 answers | `generator/js/engine/digger.js`, `generator/js/engine/events.js`, `generator/js/engine/pipeline.js` if chosen, `generator/tests/soak.js`, result-view and acceptance tests | L; Generator quick, affected replay goldens |
| MS06 | Target comparator, proposal separation and selected refine/local policy; ST5 / SV3-04 | MS05, S03 answer | `generator/js/engine/digger.js`, help/explain texts, comparator/digger/floor tests | L; Generator quick, replay/step goldens |
| MS07 | Enforced short/long and shallow/deep IDs; ST6 / SV3-06 | MS06, S04 answer | `core/js/engine/tech-chain.js`, `core/js/engine/tech-subset.js` counter localisation if necessary, chain tests | L; both quick, mandatory new-ID help/fixtures, first consolidated qualify/hash/manual-difficulty checkpoint |
| MS08 | Skyscraper/two-string kite/empty rectangle; ST7 / SV3-07/08 | MS07 | `core/js/engine/tech-fish.js`, fish positives/negatives/proof tests | L; split direct grouped rectangle if >1,600 lines; both quick, help/replay gates |
| MS09 | Finned X-Wing/Swordfish including sashimi; ST8 / SV3-09 | MS08 | `core/js/engine/tech-fish.js`, fish tests | L; both quick, help/replay gates |
| MS10 | Remote pairs and WXYZ; ST9 part / SV3-10 | MS09, S05 limits | `core/js/engine/tech-wing.js`, wing tests | L; both quick, help/replay gates |
| MS11 | UR 3/4/hidden and guarded BUG+1; ST9 part / SV3-11 | MS10 | `core/js/engine/tech-wing.js`, wing/uniqueness-registry tests | L; both quick, help/replay gates |
| MS12 | Restricted XY-chain; ST10 part / SV3-12 | MS11 | `core/js/engine/tech-chain.js`, chain tests | M-L; both quick, help/replay gates |
| MS13 | Group-node graph, bounded search, proof representation/formatting; ST10 part / SV3-13 | MS12, S05 limits | `core/js/engine/tech-chain.js`, chain proof checker, `generator/js/ui/i18n.js`, `player/js/ui/i18n.js`, `player/js/ui/play.js`, formatting tests | L; split graph and integration if needed; both quick, help/replay refresh |
| MS14 | Law of leftovers and ordinary Killer interaction quick coverage; ST11 / SV3-14 | MS13, S05 limits | `core/js/engine/tech-subset.js`, new or existing scoped rule tests, Jigsaw example inputs | L; both quick, affected manual variant checks and help/replay |
| MS15 | Bounded ALS enumerator and ALS-XZ; ST12 part / SV3-15 | MS14, S05/S08 contracts | New `core/js/engine/tech-als.js`, new core ALS suite, eight source lists and both HTML core-suite lists | L; both quick, help/replay |
| MS16 | Sue de Coq and final long-chain order 198; ST12 part / SV3-16 | MS15 | `core/js/engine/tech-als.js`, ALS tests, chain registration order | L; both quick, help/replay |
| MS17 | v3 version/cache/history/export integration and live docs; ST13 part / SV3-17 | MS16, S07/S10 answers | `generator/js/engine/difficulty.js`, cache/history/export as agreed, version/compatibility tests, notes/docs index | M-L; both quick, required wire/golden/example refresh |
| MS18 | Final qualification, p95/soak and support-list evidence; ST13 part / SV3-18 | MS17 | Approved reporting tools, regression records, variant support lists, new v3 evidence and living documentation | M-L excluding generated evidence; final gates below |

```text
MS01 -> MS02 -> MS03 -> MS04 -> MS05 -> MS06 -> MS07
  -> MS08 -> MS09 -> MS10 -> MS11 -> MS12 -> MS13 -> MS14 -> MS15 -> MS16 -> MS17 -> MS18
```

Some arrows are exclusive ownership sequencing, not algorithmic dependencies. The classic pattern groups,
leftovers and ALS are conceptually separable, but share the integration bundle and golden/help outputs.
No safe second developer is needed in this checkout. Pentomino implementation can run concurrently;
the same machine's performance/qualification measurements should be serialised to avoid distorted p95.

### 5.3 Gate allocation

| Gate | Owner | Required evidence |
|---|---|---|
| S0 baseline soak | MS02 | Explicit variant/level/count shards, before order/output changes; peak/depth/length and in-band shallow denominators; raw failure/timeout outcomes |
| Order/generator quick-breaking goldens | MS03 and every output-changing MS05-MS17 task | Regenerate `generator/tests/fixtures/replay-wire.js` when needed and separately the 14 analysis expectations; review changed step assertions, not only wire data |
| New-ID help examples | Every introducing MS07-MS16 task, via MS04 tooling | Two positive/one negative unscoped fixtures; scoped positives for Jigsaw; a real Player example per registered ID; exact current hint replay |
| First consolidated S1/S2 checkpoint | MS07 | `generator/tests/perf.js --update-hashes` and `--check-hashes`; bounded `generator/tests/qualify.js` shards; manual `difficulty` suite; both quick sets |
| Final hash / replay / examples | MS17/MS18 | Current final v3 data, retained legacy compatibility cases, honest reason for every intentional change |
| Final p95 | MS18 | `generator/tests/perf.js --variant=<id> --level=<ids> --runs=50 --gate`, bounded complete shards; hash update alone is not a timing gate |
| Final qualification | MS18 | Fixed 40/100-seed protocol per pair with recorded completeness, new `docs/difficulty-v3/qualification.md`, corresponding support-list and living-link updates |
| Final soak/manual | MS18 | Matched before/after distributions, certified exactness invariant, manual difficulty and affected plan-named variant selectors; final both quick sets |

All commands are run from the documented app directory with Windows command separators/paths. No blanket
permission for additional unrelated heavy suites is inferred. Pre-approved plan gates are not waiting on
another owner permission round.

SA1's suggestion to detach long qualification runs is not necessary or desirable for bounded work.
Use attached monitored processes and complete shards; record partial/incomplete qualification rather than
silently discarding slow seeds. Do not call a short probe “qualified”.

## 6. Errata to my first report

The first report remains the independent record. These statements qualify or supersede it:

1. **Keeper precheck:** I overstated the need to rewrite `keeper.closer`. Under the current distance-plus-
   shallow-penalty ordering it is a valid optimistic precheck. Recompute final distance after certification
   and never save the optimistic distance; revise the precheck only if new target/unknown ranking
   invalidates its lower-bound property.
2. **Broader floor effect:** Add the reproduced old Nightmare length distribution and the variant samples.
   The risk is not concentrated at classic9 Hard/Expert.
3. **Chain cutoff evidence:** <=4 is a plausible candidate, not an adopted fix. The new simulation shows
   only 2/12 exact old Nightmare after reweighting, despite 6/12 stuck lower floors.
4. **Jigsaw help:** My generic example-tool warning omitted the precise missing region snapshot and
   model reconstruction. The generator already has Jigsaw in its corpus plan; reuse
   `player/js/engine/text-boards.js:141`.
5. **Step goldens:** Add `generator/tests/suites/steps.test.js:879-889` to the repeated output-change
   obligations, not only the replay suite and wire fixtures.
6. **Task order/gate efficiency:** Move order correction ahead of acceptance integration after the baseline.
   Consolidate heavy qualification/hash checkpoints while keeping quick-breaking goldens/examples
   updated within their owning task.
7. **Question triage:** Easy tier semantics, ordinary Killer interactions and final qualification policy
   need documentation/correct implementation, not another product decision by default.

## 7. Sign-off position

I would sign the merged task order and the concrete correctness/integration requirements above. I would
not sign a six-link or four-link split as “qualified” without new-generation evidence; a maximum-only long
finder; missing floor evidence treated as exact; an automatic 128-rating policy; or a history marker that
misidentifies regenerated current puzzles as v2.

SA1's 43-67 hours is developer-agent time; my 118-187 hours is engineering effort including extensive
soundness/integration work. They are not comparable measured quantities. The joint plan should retain
task sizes, explicit fixture/tooling work and measured gate durations rather than promise a precise
wall-clock delivery from either estimate.
