# MS14b — Register Jigsaw law of leftovers

| Header | Value |
|---|---|
| Depends on | MS14a and MS13c accepted |
| Accepted implementation base | `9d58d86` (MS13c); later pack-only commits do not replace this runtime baseline |
| Size / active time | Medium; 40-55 minutes plus gates |
| Owner / milestone | Shared subset / both apps; M14b |
| Authority | R10/R17/R20/R21; SA2-Q-S09/S11; S-OD11 and S-OD12/S0 handoff |
| Review | Orchestrator against MS08a/IR72 and generic soundness/order checks; no routine SA1 review |
| Status | Not started; ready for serial dispatch from `9d58d86` |

## Goal & business context

Bring the proved multiset rule into Jigsaw ratings and hints, including a real region-aware example.

## Scope

In: registration/weight, scoped fixtures, cost adapter, locales/help, current references.
Out: new Killer technique, non-Jigsaw scope or changing earlier pattern limits.

## Repository rules

AGENTS/checklist and B; no Git/pack/log edits. Core tests build models without Generator-only code.
Real help uses MS03c cellRegion, never an invented candidate-state format.

**Prerequisites are satisfied:** MS14a is accepted at `ea14798`, and MS13c at **`9d58d86`**.
The next order is MS14b -> MS14c, one task/writer at a time. Use the current checkout with this
accepted implementation, not a restored MS14a/MS13b source. Neither predecessor's E replaces
this task's full activation B/E/GH/cost/quick/CI closure.

### Accepted baseline and MS13c handoff — 2026-11-17

The accepted final results are in `docs/difficulty-v3/evidence/MS13c/evidence.md` section 12,
`quick-final-2/` and `sa1-review.md` (round 2). Do not use the superseded candidate quick pair:

| App | Accepted tests / suites | Complete quick wall | Accepted fingerprint |
|---|---|---|---|
| Generator | **4,483 / 53** | **476.0 s** | `1f7c0d87bdf1957f399d433829e742a1afc22112e52a7f1b7355bb779992737e` |
| Player | **2,722 / 30** | **93.6 s** | `3d565adc10c6ea2d2efe62e5d7979859b05a7b4f2579d65de2bd007f0e657944` |

Preserve the accepted CI projections (seconds): **core-shared 130, steps 60, replay 60,
pipeline 80, Generator player shard 70, Player job 150**; mega 40, own-fast 320 and
digger-target 30 are unchanged. The earlier candidate's pipeline 70/Player 140 and old
MS14a/MS13b totals are not the baseline. Retain all predecessor tests/helper/HTML entries,
derive final inventories and fingerprints after this task's additions, and maintain projections
by the existing measured rule before closure. Baseline timings are not promises for changed code.

**Grouped chains are active under S-OD11.** Keep their bounded grouped attempt, short-only
uncapped singleton fallback, parent/window rules, proof domains, consumers and real v2 round-trip
tests intact. This task does not edit the chain policy, transfer its fallback to leftovers,
or spend an earlier finder's unused tuning allowance. Use the MS13c canonical wires/goldens/
hashes and catalogue as the comparison baseline, not the pre-activation MS14a fixtures.

**S-AV38 is cost context to carry, not another implementation assignment.** MS13c's GP is an
honestly incomplete intermediate matrix, not a complete passing GP/main comparison. Keep its
source-qualified observations/gaps, S-AV36 and the inherited items. Do not repair chain cost,
raise targets/guards, prune offers or add a whole-GP campaign here. Performance targets are
not command-time upper bounds; use credible source-qualified projections, not a different
board/level's timing or an assumed target, and retain unsafe/unmeasured outcomes honestly.

### Mandatory QUESTION pause and S-OD12/S0

**Any `QUESTION:` stops this task for the orchestrator.** Stop before the undecided action;
do not apply a proposed default, continue independent edits/runs, begin more acquisition/E,
or treat the question as permission. Return the current state, evidence, options and default
as a **proposal**, then wait for the orchestrator's answer and explicit resumption.
Preserve the outcome of an already-running bounded command or safely interrupt it through
the normal helper; never leave an orphaned process/stale lock. An unresolved decision still
requires this pause even if it is labelled "informational" rather than `QUESTION:`.

This is an orchestrator pause, not a requirement to ask the owner about every ordinary timing
miss. A performance/cap observation already covered by the fixed rules is a numbered item,
not an unresolved question; it may be reported while continuing within those rules. Once a
question is raised, however, no default is self-approved. The orchestrator routes any needed
recorded-decision change or permission expansion to the owner.

**No corpus source-acquisition scan without prior owner authorization.** S-OD12 approved only
MS13c's completed Jellyfish use retrospectively and selected **S0**, not S1. Neither S-OD10
nor S-OD12 permits a fresh scan for this task/ID/variant, including a cached or test-kit corpus;
the provenance format and copied acquisition scripts do not supply permission.
Ordinary bundle B remains authorized: existing real sources/known unique fixtures first,
then at most four distinct Generator discovery batches of twelve attempted requests, with
its existing hint/time/lock bounds. Do not reset those counts after a failed batch or source edit.
If that route cannot supply the required real data, raise `QUESTION:` and stop for the
orchestrator/owner, not an unapproved broader scan. The existing soundness tests and S-AV37
measurements on already-owned fixture/B/GH positions are not a new acquisition campaign.

## Inputs & context

R17, verbatim:

> Put `lawOfLeftovers` in `core/js/engine/tech-subset.js`: order 87, weight 200, group `locked`,
> scope `['jigsaw9']`, no uniqueness assumption.

Use R10's fixed **baseCost 20**. This adds one ID/example (37 -> 38 after valid GH);
derive the actual registry/test inventories and preserve the frozen v2 history.

Use MS14a's complete multiset/support kernel unchanged. Initial limits: 2 units/side, 4 difference
cells/side, 50000 work units/call. Scope check is explicit in the finder too. R10 Finding and key
`technique.lawOfLeftovers.step`; localized args use numeric `digits` and string line/region/cell labels.
Both EN+VI locale pairs get name, desc and step.
Retain MS14a's settled Finding semantics: `cells` is the sorted union of leftover sides
(fixed cells included), argument cell labels follow it, `digits` is the distinct **removed**
digits, and chosen-unit labels follow unit-index order. A completed empty signature intersection
declines the whole call; incomplete support never means absence. Do not reinterpret `digits`
as a shared multiset or introduce a new per-side schema while integrating the locale/help text.

### S-AV37 — inherited leftover-layout cost/cap item

Source: accepted inactive kernel **`ea14798`**, `docs/difficulty-v3/evidence/MS14a/evidence.md`
C4 and the named item, with `core/tests/fixtures/jigsaw-models.js` and the subset suite.
The reported full blank-state work is **98,530 (`staggered`)**, **81,664 (`wavy`)**,
**33,784 (`mixed`)**, **6,469 (`crossed`)** and **3,436 (`boxes` control)**.
At the 50,000 default, **only the first two of these cap** and return null with `capHit:'work'`;
33,784 is below the limit, not a third capped case. These are constructed per-layout work
counts, not a universal bound for generated Jigsaws, a real-puzzle cap rate, lost-deduction
count or GP/qualification verdict. The 480 seeded fixture-position agreement tests do not
constitute the missing generated-layout/real-puzzle-position cost census.

This task is the first measurement/disposition owner under its **existing** scoped fixture,
cost-adapter and bounded integration work. Record default work, cap outcomes and latency on
the actual scoped positive/negative fixtures and real-puzzle positions already used/acquired
for B/GH, with the layout/region map, source/seed, preprocessing, denominator and final source.
Keep blank stress, seeded fixture and real-puzzle populations separate. State what layout/
position population remains unmeasured rather than claiming that a small sample covers all
Jigsaws or that no real cap exists.

Keep the 2/4/50,000 starting limits. If the already-permitted once-only R10 adjustment is
proposed, justify the common new value with before/after cap and latency evidence before
final E; otherwise record the reason for retaining the defaults. No automatic increase to
98,530, board/layout-dependent limit, changed work unit, partial-support deduction, S-OD11
fallback or tuning of another finder is authorized. This item alone authorizes no broad
layout-generation campaign, extra discovery allowance, new tooling/evidence class or new gate.
The choice is based on measured coverage/cost, not avoiding E or quick-set reruns.
Continue within the existing locked command/admission bounds; ordinary B/GH/correctness
requirements are not waived by a numerical item.

Hand off the measured/current-limit disposition and remaining gaps as **S-AV37**. MS14c
carries it through the M14 handoff only; final measured availability goes to MS18c, cost to
MS18d and the full source/decision/evidence reconciliation to MS18e.

Add real scoped cases under `SG.fixtures.jigsawTechniques`: `{cellRegion,givens,after,expect}`
with explicit preprocessing IDs, or a full plain core model specification. Two positive cases
(row/column duals) and negative cases; independently count/prove against that exact region map.
Do not add this scoped ID to the classic-only F.ids map. Cost tool gains a scoped-case adapter.
Help snapshot `cellRegion` must be copied and reconstructed by MS03c; validate actual Player replay.

**Scoped cost adapter:** the current refusal is in
`generator/tests/fixtures/pattern-cost.js::inventoryOf/planCases`, not only the CLI. This
task owns that helper, the CLI and their tests for the Jigsaw-specific route. Reconstruct
each case from its actual region map/core model, never the default classic9 model; reuse
`SG.fixtures.jigsawModels` where appropriate. Preserve unscoped behavior, unknown/unsupported
scope rejection, fixture-mismatch failures, post-finder budget checks and protected output
paths. Verify that record identities include the new scoped fixtures/helper as applicable.
Keep the existing random soundness population; any supplemental Jigsaw cases are appended
at the model-aware scoped call site, not inserted into the classic-only map.

Current anchors: `player/js/engine/text-boards.js::jigsawSpec`;
`core/js/engine/tech-subset.js::findLeftovers`, `SG.leftoverPatterns` and `SG.techniques.register`;
`core/tests/fixtures/jigsaw-models.js` (`SG.fixtures.jigsawModels`).

## Files to create/modify

- Subset engine/suite; new `core/tests/fixtures/jigsaw-techniques.js`, both tests.html fixture lists.
- `generator/tests/pattern-cost.js`, `generator/tests/fixtures/pattern-cost.js` and the
  `pattern-cost-tools` suite for the scoped adapter; full scoped B/E.
- Generator/Player designs, both guide languages and v3 notes.

## Implementation steps

1. Register the scoped ID/weight and add real model-aware fixtures.
2. Add scope/soundness/budget tests in both app harnesses and cost-tool support.
3. Add locale/help integration, generate a real Jigsaw snapshot and validate its regions.
4. Record bounds/reference changes, E/GH/cost and quick results.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS14b-B01 | Jigsaw hints explain equal multisets on the actual irregular regions |
| MS14b-B02 | Other variants do not gain an unsupported scoped rule |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS14b-T01 | Scope/weight/order, complete support and real row/column positives pass |
| MS14b-T02 | Both runners can build fixtures; cellRegion and real hint replay match |
| MS14b-T03 | Full B/E/GH/cost and both quick sets pass |

## Test plan and gates

Generator `node tests\node-runner.js --suite=tech-subset,techniques,technique-weights,difficulty-floor,pattern-cost-tools`;
Player `--suite=tech-subset,help,text-boards`; both quick sets. Complete E MS14b:

Finish any permitted own-limit selection and freeze the included source first. Record in
order **five G09-G13 wires -> fourteen G01-G14 analyses -> all 520 hashes**, using the
existing E/IR12 recipe and MS13c's source-qualified item timings for admission. Merge-check
the complete families before publication, explain each changed key/qualifying tier, then
publish only the owned intended updates and refresh pins under I2. Do not restore or retag
MS14a's older ledgers/fixtures. Any later included-source byte change invokes the ordinary
fresh-record rules. Finish current GH and all fingerprinted fixtures/docs/counts before
the final complete quick sets and CI check.

```powershell
node tests\perf.js --hash-key=classic4/veryEasy --hash-from=0 --hash-count=5 --hash-record=..\docs\difficulty-v3\evidence\MS14b\hashes\classic4-veryEasy-00.json
node tests\replay-goldens.js --ids=G01 --record=..\docs\difficulty-v3\evidence\MS14b\analysis\G01.json
node tests\pattern-cost.js --ids=lawOfLeftovers --runs=20 --json=..\docs\difficulty-v3\evidence\MS14b\pattern-cost.json
```

Player, bounded discovery and then complete source-based write/check:

```powershell
node tests\tools\make-technique-examples.js ..\generator --ids=lawOfLeftovers --discover --variants=jigsaw9 --levels=hard --max-puzzles=12 --max-hints=400 --record-sources=tests\artifacts\difficulty-v3\MS14b\sources.json
node tests\tools\make-technique-examples.js ..\generator --ids=lawOfLeftovers --sources=tests\artifacts\difficulty-v3\MS14b\sources.json --max-puzzles=8 --max-hints=400 --write
node tests\tools\make-technique-examples.js ..\generator --ids=lawOfLeftovers --sources=tests\artifacts\difficulty-v3\MS14b\sources.json --max-puzzles=8 --max-hints=400 --check
```

B permits bounded batches from Jigsaw's actual PLAN levels hard/expert/master if needed. Jobs 1/no --jobs; E 10-90
minutes, cost 1-60 seconds, GH 1-120 seconds curated/discovery<=8 minutes.
**Announce the planned bounded gates to the orchestrator before starting.** Pentomino is finished;
the shared-lock, admission, process-ceiling and 15-second-gap rules still apply. Report an
apparently stale lock before cleanup; do not infer another holder or remove a lock on your own.
Only this introducing rule's limits may adjust once with evidence; 540-second process ceiling.

## Definition of done & handoff

Report real region/proof/source data, final scoped limits and S-AV37's source-qualified
measurements/disposition or explicit remaining gaps. No duplicate cageLocked ID appears.

## Resume rules — S-OD4

Review: orchestrator against MS08a's template and generic soundness/order-invariant suites,
not routine analyst cross-review. Correctness/evidence corruption or changing a decision stops;
time/availability is a named numerical item for MS18c/MS18d and work continues within the bounds.
The QUESTION pause above applies immediately whenever a ruling is requested; performance-item
continuation is not permission to apply an unanswered default.
Use `Invoke-Dv3Node` for all possibly >10-second payloads, <=540 s, and the current bounded quick
manifest. Any added suite owns its r6c CI group. No new slow-cell evidence/tooling class.
Return the inherited/new item list, actual gates and CI membership.

## Execution log

| Field | Value |
|---|---|
| Status | |
| Start | |
| End | |
| Duration | |
| Model | |
| Token usage | |
| AI credits | |
| Verification | |
| Acceptance | |
| Issues & resolutions | |
| Handoff | |
