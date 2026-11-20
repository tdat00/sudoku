# MS05b1 — Required exactness in the engine

| Header | Value |
|---|---|
| Depends on | MS05a accepted and committed (`f788e02`); MS04's `requiredOf` |
| Size / active time | Implemented scope retained; no redispatch; closure at r6b/r6c |
| Owner / milestone | Generator engine and activation UI; M5b1 |
| Authority | R2-R5; SA1-Q-S7/S3, SA2-Q-S06; FS02-FS05; S-OD2 acceptance amendment |
| Status | Retained in non-green pause commit a7f6660; not accepted or an independent redispatch |

**Resume, S-OD2-S-OD4:** keep the implementation and failed/interim evidence saved by the owner at
the pause. r1-r4 already have step evidence; the next dispatch is
[MS05r5p](MS05r5p-size-dependent-default-attempts.md), not b1 or r1 again.
All B/T duties below remain in the combined r6b audit, with r6c CI before the one combined commit.
S-OD3/S-OD4 allow the size default, G13 persistence and mega tier replacement in their named tasks;
the old performance-only stops are superseded. No dark switch, provisional allowance or new checkpoint.
The implementation anchors below describe the original b1 assignment, not a current redispatch.

## Goal & business context

Make exact puzzles genuinely need their requested tier, without wasting the rest of an attempt
after a required candidate has already been found. Activate the prepared shallow explanation.
MS05r2 absorbs MS05b2's diagnostic/qualification/manual consumers without changing generation.

## Scope

In: canonical requiredness, keeper prefilters, sample/local/outer exits, shallow continuation
after refinement, model-safe ratings, events/warnings, explanation highlighting, tests and docs.
Out: soak/qualifier/manual predicates (MS05r2), extra shallow allowance (MS05r3/r4), target policy,
new techniques, sign-dig optimisation (MS05e), offers or scoring changes.

## Repository rules

AGENTS/checklist; no Git, task-pack or Execution-log edits. Classic IIFEs; CRLF/no BOM/final newline.
Use the inherited budget and canonical rating; no second production floor solve or exported floor
certificate. Both complete quick sets must pass at MS05r6, using its bounded manifest. Run only
the current recovery task's named gates, after announcement and the shared
lock. Existing tests may change only where their old exactness/warning contract intentionally changes.

## Inputs & context

### R3 contract

```text
isExact(rating, L, model) =
  rating exists AND rating.solved === true AND rating.level === L
  AND SG.difficulty.requiredOf(rating, L, model)?.required === true

quality(rating, requestedSpec, L, candidateModel):
  missing model or absent/incomplete rating -> Infinity
  complete rating in L, required -> 0
  complete rating in L, shallow -> 0.5
  otherwise -> existing level-gap distance
```

The existing off-band calculation remains `gap * 1000 + off`, where
`gap = abs(levelIndex(rating.level) - levelIndex(L))`,
`off = (spec.min-score)/max(spec.min,1)` below band, or `(score-spec.max)/spec.max` above it.
Do not use the bounded oracle's `tierUsed` as a certificate. Only complete canonical ratings for
the candidate's actual model/givens qualify; a safety-net replacement invalidates its prerating.
Sign/cage changes need their own fresh rating, and a sign change invalidates the givens-only memo.

Compute quality before **every** keeper prefilter, including `closer`, not only inside `offer`.
`closer(rating, model)` requires the candidate model; update every caller, including Killer.
`offer` still requires `countWithin(candidate.model, candidate.givens, budget) === 1` before storing.
Null/2 counts cannot store; cancellation/errors propagate. Strict quality ties keep encounter order.
Do not export the private keeper for tests: use the existing strategy seam and `options.keeper`.

### First-exact and refinement continuation (FS02/FS03)

Offer every completely rated valid candidate before deciding whether the local path accepts its
score. A lower-score required neighbor can therefore win the keeper while the path rejects it.
The local loop is exactly bounded by:

```js
while (!isExact(rating, spec.level, model) &&
       !(keeper !== null && keeper.distance === 0) &&
       !capsExhausted(caps)) {
  // existing proposals, uniqueness checks and counted canonical ratings
}
```

No new proposal or rating is made after either the current state or keeper is exact. Preserve the
same first-exact stop in sampling/attempt selection and use the same predicate in `keptPuzzle`.
Returning the path's state from local search is allowed: the outer choice still selects the verified
keeper result. Do not lose that keeper winner or rate it again.

After an above-band call to `refineDown`, use this exhaustive branch table:

| Refined result | Action |
|---|---|
| Exact | Return the refined result |
| Solved, `spec.min <= score < spec.max`, not exact | Assign `givens`, `rating`, `clues` from it and continue local setup |
| Still above band, incomplete, or any other result | Return it as today; no futile local proposals |

The continuing path builds groups, unit-clue counts and an empty memo **after** those assignments.
`refineDown` already wrote its reveals into the shared log; do not duplicate them. Keep its 64-rating
limit and inequality guard. No new below-band reveal, sign-model clue addition or target polishing.
If the keeper is already exact after refinement, no local work starts.

### Events, warnings and MS05a handoff

MS05a is frozen. It already transports `exact` through result/worker/cache and prepares the schema.
This task supplies the production semantics:

| Result of the sample | Event | `required` |
|---|---|---|
| Complete in-band required, including vacuous | `tune.hit` | true |
| Complete in-band shallow | `tune.shallow` | false |
| Anything else, **including solved off-band** | `tune.miss` | null |

Keep all existing event arguments; hit retains `hardestTechnique`, shallow/miss retain sample counts.
No target is drawn here. Every non-exact returned fallback keeps `difficulty.approximate`.
Only a complete in-band shallow fallback additionally gets `difficulty.shallow`; retain one Retry.
UI/views consume the flag, never infer it again from level names.

Own the remaining MS05a explanation/text items in this activation:

- `generator/js/engine/explain-data.js`: map `tune.shallow` to the existing `retry` line; update
  its compare-line comment to include complete proof, band and required tier.
- Both Generator locales: replace the old `explain.tune.code.compare` equality-only sentence
  with that same rule, and keep the highlight's message consistent.
- Fix English `difficulty.shallow` to:
  `The puzzle is in the requested score band but does not need a technique from the {level} tier.`
  This avoids “a Easy technique”; preserve localized `{level}` and equivalent Vietnamese meaning.

### Anchors

Engine anchors below are unchanged from `2c665bb` at the MS05a handoff; UI preparation is at `f788e02`.
Use the quoted name if a preceding task moved a line.

| File:line / quote | Change |
|---|---|
| `generator/js/engine/digger.js:1041-1091`, `function createKeeper`, `function keptPuzzle` | Model-aware quality and exactness |
| `:1100-1147`, `function refineDown` | Fresh ratings; retain guards and log |
| `:1266`, `const exact =` | Sample exactness/event |
| `:1320-1499`, `function* localSearchSteps` | FS02/FS03 branches and exits |
| `:1661-1739`, `let attemptBest = null` | All sample/keeper/outer stops and warnings |
| `generator/js/variants/killer.js:825,849,907`, keeper offer / `rateCounted` / `keeper.closer(r)` | Use each layout's actual model and rating |
| `generator/js/variants/greater-than.js:403`, `keeper.offer` | Preserve actual thinned model/rating |
| `generator/js/engine/explain-data.js:131-142`, `explain.tune` | Requiredness comparison/highlight |
| `generator/js/ui/locale.en.js`, `explain.tune.code.compare`, `difficulty.shallow` | Same facts, grammatical level placeholder |

## Files to create/modify (exclusive ownership)

- `generator/js/engine/digger.js`; exactness-related Killer/Greater-Than call sites only.
- `generator/js/engine/explain-data.js`; Generator `js/ui/locale.en.js`, `locale.vi.js`;
  prepared event/view wiring only if an activation test proves a required fix.
- Existing Generator suites `digger`, `difficulty-floor`, `pipeline`, `events`, `result-view`,
  `worker`, `cache`, `steps`, `i18n`; the existing strategy/fixture helpers they use.
- Existing interim E fixtures/evidence are preserved; final complete refreshes are owned by MS05r6.
- `generator/design.md` 6.8/7.2/13.13, both user/developer guides, v3 notes.
- Evidence under `docs/difficulty-v3/evidence/MS05b1/`.

No `soak.js`, `qualify.js` or manual-suite edits here; MS05r2 owns them. Their legacy predicates
must not be used to claim final qualification. There is no interim commit or additional setting/cap.

## Implementation steps

1. Implement the one private exactness/quality rule and update every model-aware keeper caller.
2. Apply the first-exact exits and the three refinement outcomes; preserve secured-model/memo behavior.
3. Emit the prepared events and warnings; finish the explicit MS05a explanation/text handoff.
4. Add focused strategy-seam tests and update only directly obsolete exactness/warning assertions.
5. Preserve the completed implementation/interim artifacts; hand them to MS05r1. Final GG/GR,
   pins, living facts and complete bounded quick coverage belong to the combined MS05r6 acceptance.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS05b1-B01 | A shallow result cannot block or impersonate required exactness |
| MS05b1-B02 | Finding a required keeper result ends unnecessary search immediately |
| MS05b1-B03 | Shallow fallback is explained in both languages with Retry; no invalid puzzle is published |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS05b1-T01 | Quality 0.5/0, reverse order, exact ties and null/ambiguous counts are covered |
| MS05b1-T02 | Every rating/prefilter uses the actual model; safety replacement and sign memo invalidation are tested |
| MS05b1-T03 | All refinement branch outcomes and the keeper-zero local stop have exact work/proposal assertions |
| MS05b1-T04 | hit=true, shallow=false, every miss=null; solved off-band tested; explanation highlight and grammar corrected |
| MS05b1-T05 | Sync/cooperative parity, original enclosing caps, worker/cache flags, full bounded quick coverage and explained final-source GG/GR pass at MS05r6 |

## Test plan and gates

Use controlled canonical-rating reports through existing seams, not a histogram as proof:

- Keeper 0.5 then 0 replaces; 0 then 0.5 does not; equal quality keeps first. CountWithin null/2 never stores.
- Local current in-band shallow, first neighbor lower-score required: keeper stores it; path may reject its
  score decrease; **no next proposal/rating**, one counted neighbor rating, returned global result is required.
- Above-band -> in-band shallow: continue from refined givens, correct clue/unit counts and existing log.
  Above-band -> still above: return with no local proposals. Above-band -> exact: no further search.
- Sign/cage model changes, stale prerating after safety net, missing/unsolved ratings, cap return null,
  cancellation, and equal-distance encounters.
- Real small unique variants; complete off-band sample emits miss/null, not true; VeryEasy remains vacuous.
- `SG.explain.lineFor('tune','tune.shallow')` selects retry; English Easy label reads naturally; EN/VI parity.

Do not rerun the previous whole/combined long selectors or renew the incomplete interim E.
MS05r3 covers focused allowance/counter regressions while preserving these semantics. MS05r6
owns fresh complete E, wire before analysis, the genuine G06/G07 pins and both full quick
sets via the checked bounded manifest. The resumed G13/mega checks use S-OD3/S-OD4 contracts.
All fixed requests/assertions remain. The original MS05b1 artifact directory is historical,
not the final-source acceptance directory. Every possibly >10-second command uses the shared
lock, jobs 1/no `--jobs`, <=540 s. No separate b1 GQ/GP/GD or commit.

## Definition of done & handoff

Keep the developer's predicate/caller/keeper/model-safety/warning handoff and all interim
failures. MS05r1 starts with the preserved implementation; r2/r3/r4 complete the consumers,
measurement and selection (already retained). r6b audits these B/T duties and r6c closes CI;
the historical pause commit was not green and must be identified as such in the combined commit.
CV6 remains separately owned by MS05e, which cannot start before the combined commit.

## Execution log

| Field | Value |
|---|---|
| Status | Accepted in the combined commit `difficulty-v3 MS05: required exactness with measured bounded recovery` (S-OD2: retained implementation closed by MS05r6b's audit and MS05r6c's CI closure) |
| Start | 2026-11-12 18:57 (+07:00) |
| End | 2026-11-12 about 22:10 developer (implementation retained by S-OD2); closure 2026-11-14 12:13 (MS05r6c), combined commit 12:26 |
| Duration | about 2 h 45 min developer (the previous orchestrator session's record; not in the repository's logs); closed through the recovery steps MS05r1 to MS05r6c |
| Model | claude-sonnet-5.5 (developer); closure reviewed by the analysts SA1 (claude-opus-5.5) and SA2 (gpt-6-astra); orchestrator claude-opus-5.5 |
| Token usage | not recorded (previous orchestrator session) |
| AI credits | not recorded |
| Verification | MS05r6b's combined audit (`docs/difficulty-v3/evidence/MS05r6b/audit.md`): MS05b1 B01-B03 and T01-T05 met on the final source; complete quick sets green on the final tree (MS05r6c: Generator 3,262/3,262 `6b40d218…`, Player 1,683/1,683 `547e4a4e…`); E (520 hashes, five wires, fourteen analyses) recorded by MS05r6a; analyst implementation reviews IR01-IR22 (`docs/difficulty-v3/claude-opus-5.5/10-review-of-recovery-steps.md`) |
| Acceptance | Requiredness active in the engine: a Hard-or-above puzzle is exact only when it needs a technique of its tier (`requiredOf`, the derived certificate); the keeper and the stops follow exactness; the shallow fallback carries `difficulty.approximate` and `difficulty.shallow`. With the recovery: the local-search allowance 256 (MS05r4), the size default 8/4/2 (MS05r5p, CV6-03 (c2), CV6-04 (b)), the bounded quick coverage and CI tiers (MS05r5, MS05r6c), the mega Nightmare deep contract (MS05r5m), the lazy manual corpora (MS05b3), G13 persisted with the complete E (MS05r6a) |
| Issues & resolutions | Requiredness made the large-board and Killer cells slow or empty (CV6-02, CV6-03): the owner's S-OD2 to S-OD5 and the plan author's answers (PR-S1, CV6-03, CV6-04, PR-S2) set the recovery; availability findings are named items S-AV01 to S-AV15 routed to MS07e and MS18c/MS18d. The owner-ordered pause commit `a7f6660` was not green and was not acceptance |
| Handoff | MS05e (guided sign dig, S-AV01) on the committed source; MS06a onward. The items S-AV01 to S-AV15 and MS05r6a-COV01 |
